import React, { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  const [chefs, setChefs] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState('');
  const [newChef, setNewChef] = useState({ name: '', image: '', initialElo: 1500 });
  const [episodeData, setEpisodeData] = useState({ 
    number: '', 
    title: '', 
    winners: [], 
    eliminated: [], 
    topPerformers: [],
    bottomPerformers: []
  });
  const [selectedEpisode, setSelectedEpisode] = useState(null);

  // For demo purposes - in production this would be an API call
  useEffect(() => {
    // Load data from localStorage if available
    const savedChefs = localStorage.getItem('chefs');
    const savedEpisodes = localStorage.getItem('episodes');
    
    if (savedChefs) setChefs(JSON.parse(savedChefs));
    if (savedEpisodes) setEpisodes(JSON.parse(savedEpisodes));

    // Initialize with sample data if no data exists
    if (!savedChefs) {
      const initialChefs = [
        { id: 1, name: 'Chef Alex', image: '/api/placeholder/150/150', currentElo: 1550, initialElo: 1500, history: [1500, 1550] },
        { id: 2, name: 'Chef Bianca', image: '/api/placeholder/150/150', currentElo: 1580, initialElo: 1500, history: [1500, 1580] },
        { id: 3, name: 'Chef Carlos', image: '/api/placeholder/150/150', currentElo: 1470, initialElo: 1500, history: [1500, 1470] },
        { id: 4, name: 'Chef Dani', image: '/api/placeholder/150/150', currentElo: 1530, initialElo: 1500, history: [1500, 1530] },
      ];
      setChefs(initialChefs);
      localStorage.setItem('chefs', JSON.stringify(initialChefs));
    }
    
    if (!savedEpisodes) {
      const initialEpisodes = [
        { 
          id: 1, 
          number: 1, 
          title: 'Season Premiere', 
          winners: [2], 
          eliminated: [3], 
          topPerformers: [2, 4],
          bottomPerformers: [1, 3],
          date: '2025-03-01'
        }
      ];
      setEpisodes(initialEpisodes);
      localStorage.setItem('episodes', JSON.stringify(initialEpisodes));
    }
  }, []);

  // Save changes to localStorage when data changes
  useEffect(() => {
    if (chefs.length > 0) localStorage.setItem('chefs', JSON.stringify(chefs));
    if (episodes.length > 0) localStorage.setItem('episodes', JSON.stringify(episodes));
  }, [chefs, episodes]);

  const handleAdminLogin = (e) => {
    e.preventDefault();
    // In a real application, this would be a secure authentication system
    if (password === 'admin123') {
      setIsAdmin(true);
    } else {
      alert('Incorrect password');
    }
  };

  const handleAddChef = (e) => {
    e.preventDefault();
    const newId = chefs.length > 0 ? Math.max(...chefs.map(chef => chef.id)) + 1 : 1;
    const chefToAdd = {
      ...newChef,
      id: newId,
      currentElo: newChef.initialElo,
      history: [newChef.initialElo]
    };
    setChefs([...chefs, chefToAdd]);
    setNewChef({ name: '', image: '', initialElo: 1500 });
  };

  const calculateNewElo = (chefElo, opponentElo, result) => {
    const K = 32; // K-factor determines how much rating changes
    const expectedScore = 1 / (1 + Math.pow(10, (opponentElo - chefElo) / 400));
    return Math.round(chefElo + K * (result - expectedScore));
  };

  const handleAddEpisode = (e) => {
    e.preventDefault();
    
    // Create a copy of the chefs to update their ELO ratings
    const updatedChefs = [...chefs];
    
    // Process winners (get highest ELO boost)
    episodeData.winners.forEach(winnerId => {
      const winnerIndex = updatedChefs.findIndex(chef => chef.id === parseInt(winnerId));
      if (winnerIndex !== -1) {
        // Winners get ELO boosts against everyone not in top performers
        const nonTopPerformers = chefs.filter(chef => 
          !episodeData.topPerformers.includes(chef.id.toString()) && 
          chef.id !== parseInt(winnerId)
        );
        
        let newElo = updatedChefs[winnerIndex].currentElo;
        nonTopPerformers.forEach(opponent => {
          newElo = calculateNewElo(newElo, opponent.currentElo, 1);
        });
        
        updatedChefs[winnerIndex].currentElo = newElo;
        updatedChefs[winnerIndex].history.push(newElo);
      }
    });
    
    // Process top performers
    episodeData.topPerformers.forEach(topId => {
      if (!episodeData.winners.includes(topId)) {
        const chefIndex = updatedChefs.findIndex(chef => chef.id === parseInt(topId));
        if (chefIndex !== -1) {
          // Top performers get ELO boosts against bottom performers
          const bottomPerformers = chefs.filter(chef => 
            episodeData.bottomPerformers.includes(chef.id.toString())
          );
          
          let newElo = updatedChefs[chefIndex].currentElo;
          bottomPerformers.forEach(opponent => {
            newElo = calculateNewElo(newElo, opponent.currentElo, 0.75);
          });
          
          updatedChefs[chefIndex].currentElo = newElo;
          updatedChefs[chefIndex].history.push(newElo);
        }
      }
    });
    
    // Process bottom performers
    episodeData.bottomPerformers.forEach(bottomId => {
      const chefIndex = updatedChefs.findIndex(chef => chef.id === parseInt(bottomId));
      if (chefIndex !== -1) {
        // Bottom performers lose ELO against top performers
        const topPerformers = chefs.filter(chef => 
          episodeData.topPerformers.includes(chef.id.toString()) ||
          episodeData.winners.includes(chef.id.toString())
        );
        
        let newElo = updatedChefs[chefIndex].currentElo;
        topPerformers.forEach(opponent => {
          newElo = calculateNewElo(newElo, opponent.currentElo, 0.25);
        });
        
        updatedChefs[chefIndex].currentElo = newElo;
        updatedChefs[chefIndex].history.push(newElo);
      }
    });
    
    // Process eliminated chefs (biggest ELO drop)
    episodeData.eliminated.forEach(eliminatedId => {
      const chefIndex = updatedChefs.findIndex(chef => chef.id === parseInt(eliminatedId));
      if (chefIndex !== -1) {
        // Eliminated chefs lose ELO against everyone still in the competition
        const remainingChefs = chefs.filter(chef => 
          !episodeData.eliminated.includes(chef.id.toString()) && 
          chef.id !== parseInt(eliminatedId)
        );
        
        let newElo = updatedChefs[chefIndex].currentElo;
        remainingChefs.forEach(opponent => {
          newElo = calculateNewElo(newElo, opponent.currentElo, 0);
        });
        
        updatedChefs[chefIndex].currentElo = newElo;
        updatedChefs[chefIndex].history.push(newElo);
      }
    });
    
    // Add the new episode
    const newId = episodes.length > 0 ? Math.max(...episodes.map(ep => ep.id)) + 1 : 1;
    const newEpisode = {
      ...episodeData,
      id: newId,
      date: new Date().toISOString().split('T')[0]
    };
    
    setEpisodes([...episodes, newEpisode]);
    setChefs(updatedChefs);
    setEpisodeData({ 
      number: '', 
      title: '', 
      winners: [], 
      eliminated: [], 
      topPerformers: [],
      bottomPerformers: []
    });
  };

  const handleMultiSelect = (e, field) => {
    const options = Array.from(e.target.selectedOptions).map(option => option.value);
    setEpisodeData({
      ...episodeData,
      [field]: options
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Top Chef Season 22 ELO Tracker</title>
        <meta name="description" content="Track competitive rankings for Top Chef Season 22 contestants" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-6 shadow-lg">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold">Top Chef Season 22 ELO Tracker</h1>
          <p className="text-lg opacity-90 mt-2">
            Track the competitive ranking of chefs throughout the season
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Current Rankings */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Current Chef Rankings</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chef</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ELO Rating</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {chefs
                      .sort((a, b) => b.currentElo - a.currentElo)
                      .map((chef, index) => {
                        const eloChange = chef.history.length > 1 
                          ? chef.currentElo - chef.history[chef.history.length - 2]
                          : 0;
                        const isEliminated = episodes.some(ep => 
                          ep.eliminated.includes(chef.id.toString())
                        );
                          
                        return (
                          <tr key={chef.id} className={isEliminated ? "bg-gray-100" : ""}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {index + 1}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <img 
                                    className="h-10 w-10 rounded-full" 
                                    src={chef.image} 
                                    alt={chef.name} 
                                  />
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {chef.name} {isEliminated && "(Eliminated)"}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {chef.currentElo}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                              eloChange > 0 
                                ? "text-green-600" 
                                : eloChange < 0 
                                  ? "text-red-600" 
                                  : "text-gray-500"
                            }`}>
                              {eloChange > 0 ? `+${eloChange}` : eloChange}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Episodes Log */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Episode History</h2>
              {episodes.length > 0 ? (
                <div className="space-y-4">
                  {episodes
                    .sort((a, b) => b.number - a.number)
                    .map(episode => {
                      const winners = episode.winners.map(id => 
                        chefs.find(chef => chef.id === parseInt(id))?.name
                      ).filter(Boolean);
                      
                      const eliminated = episode.eliminated.map(id => 
                        chefs.find(chef => chef.id === parseInt(id))?.name
                      ).filter(Boolean);
                      
                      return (
                        <div 
                          key={episode.id} 
                          className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                          onClick={() => setSelectedEpisode(selectedEpisode === episode.id ? null : episode.id)}
                        >
                          <div className="flex justify-between items-center">
                            <h3 className="text-lg font-medium">
                              Episode {episode.number}: {episode.title}
                            </h3>
                            <span className="text-sm text-gray-500">{episode.date}</span>
                          </div>
                          {selectedEpisode === episode.id && (
                            <div className="mt-4 text-sm text-gray-600">
                              <p className="mb-2">
                                <span className="font-medium">Winner{winners.length > 1 ? 's' : ''}:</span> {winners.join(', ')}
                              </p>
                              {eliminated.length > 0 && (
                                <p className="mb-2">
                                  <span className="font-medium">Eliminated:</span> {eliminated.join(', ')}
                                </p>
                              )}
                              <div className="mt-4 grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-medium mb-1">Top Performers</h4>
                                  <ul className="list-disc pl-5">
                                    {episode.topPerformers.map(id => {
                                      const chef = chefs.find(c => c.id === parseInt(id));
                                      return chef ? <li key={id}>{chef.name}</li> : null;
                                    })}
                                  </ul>
                                </div>
                                <div>
                                  <h4 className="font-medium mb-1">Bottom Performers</h4>
                                  <ul className="list-disc pl-5">
                                    {episode.bottomPerformers.map(id => {
                                      const chef = chefs.find(c => c.id === parseInt(id));
                                      return chef ? <li key={id}>{chef.name}</li> : null;
                                    })}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-gray-500">No episodes have been added yet.</p>
              )}
            </div>
          </div>

          {/* Admin Panel */}
          <div className="md:col-span-1">
            {!isAdmin ? (
              <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 className="text-xl font-bold mb-4 text-gray-800">Admin Login</h2>
                <form onSubmit={handleAdminLogin}>
                  <div className="mb-4">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Login
                  </button>
                </form>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Admin Panel</h2>
                    <button
                      onClick={() => setIsAdmin(false)}
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      Logout
                    </button>
                  </div>
                  
                  <div className="mb-8">
                    <h3 className="text-lg font-medium mb-3">Add New Chef</h3>
                    <form onSubmit={handleAddChef}>
                      <div className="mb-3">
                        <label htmlFor="chefName" className="block text-sm font-medium text-gray-700 mb-1">
                          Name
                        </label>
                        <input
                          type="text"
                          id="chefName"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          value={newChef.name}
                          onChange={(e) => setNewChef({...newChef, name: e.target.value})}
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label htmlFor="chefImage" className="block text-sm font-medium text-gray-700 mb-1">
                          Image URL
                        </label>
                        <input
                          type="text"
                          id="chefImage"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          value={newChef.image}
                          onChange={(e) => setNewChef({...newChef, image: e.target.value})}
                          placeholder="/api/placeholder/150/150"
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label htmlFor="initialElo" className="block text-sm font-medium text-gray-700 mb-1">
                          Initial ELO
                        </label>
                        <input
                          type="number"
                          id="initialElo"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          value={newChef.initialElo}
                          onChange={(e) => setNewChef({...newChef, initialElo: parseInt(e.target.value)})}
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        Add Chef
                      </button>
                    </form>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-3">Add Episode Data</h3>
                    <form onSubmit={handleAddEpisode}>
                      <div className="mb-3">
                        <label htmlFor="episodeNumber" className="block text-sm font-medium text-gray-700 mb-1">
                          Episode Number
                        </label>
                        <input
                          type="number"
                          id="episodeNumber"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          value={episodeData.number}
                          onChange={(e) => setEpisodeData({...episodeData, number: parseInt(e.target.value)})}
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label htmlFor="episodeTitle" className="block text-sm font-medium text-gray-700 mb-1">
                          Episode Title
                        </label>
                        <input
                          type="text"
                          id="episodeTitle"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          value={episodeData.title}
                          onChange={(e) => setEpisodeData({...episodeData, title: e.target.value})}
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label htmlFor="winners" className="block text-sm font-medium text-gray-700 mb-1">
                          Winner(s)
                        </label>
                        <select
                          id="winners"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          multiple
                          value={episodeData.winners}
                          onChange={(e) => handleMultiSelect(e, 'winners')}
                          required
                        >
                          {chefs.map(chef => (
                            <option key={`winner-${chef.id}`} value={chef.id}>
                              {chef.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                      </div>
                      <div className="mb-3">
                        <label htmlFor="eliminated" className="block text-sm font-medium text-gray-700 mb-1">
                          Eliminated
                        </label>
                        <select
                          id="eliminated"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          multiple
                          value={episodeData.eliminated}
                          onChange={(e) => handleMultiSelect(e, 'eliminated')}
                        >
                          {chefs.map(chef => (
                            <option key={`eliminated-${chef.id}`} value={chef.id}>
                              {chef.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                      </div>
                      <div className="mb-3">
                        <label htmlFor="topPerformers" className="block text-sm font-medium text-gray-700 mb-1">
                          Top Performers
                        </label>
                        <select
                          id="topPerformers"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          multiple
                          value={episodeData.topPerformers}
                          onChange={(e) => handleMultiSelect(e, 'topPerformers')}
                          required
                        >
                          {chefs.map(chef => (
                            <option key={`top-${chef.id}`} value={chef.id}>
                              {chef.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                      </div>
                      <div className="mb-3">
                        <label htmlFor="bottomPerformers" className="block text-sm font-medium text-gray-700 mb-1">
                          Bottom Performers
                        </label>
                        <select
                          id="bottomPerformers"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          multiple
                          value={episodeData.bottomPerformers}
                          onChange={(e) => handleMultiSelect(e, 'bottomPerformers')}
                          required
                        >
                          {chefs.map(chef => (
                            <option key={`bottom-${chef.id}`} value={chef.id}>
                              {chef.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Add Episode Data
                      </button>
                    </form>
                  </div>
                </div>
              </>
            )}
            
            {/* About ELO */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4 text-gray-800">About ELO Rating</h2>
              <p className="text-sm text-gray-600 mb-3">
                ELO is a rating system originally designed for chess, now adapted for Top Chef Season 22. 
                It measures the relative skill levels of competitors.
              </p>
              <p className="text-sm text-gray-600 mb-3">
                All chefs start with a base rating of 1500. After each episode, ratings are adjusted based on 
                performance:
              </p>
              <ul className="list-disc pl-5 text-sm text-gray-600 mb-3">
                <li>Winners gain the most points</li>
                <li>Top performers gain points</li>
                <li>Bottom performers lose points</li>
                <li>Eliminated chefs lose the most points</li>
              </ul>
              <p className="text-sm text-gray-600">
                The magnitude of change depends on the relative ratings of the chefs being compared.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-gray-800 text-white py-8 mt-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="text-xl font-bold">Top Chef Season 22 ELO Tracker</h3>
              <p className="text-sm opacity-70 mt-1">Follow your favorite chefs throughout the season</p>
            </div>
            <div className="text-sm opacity-70">
              © {new Date().getFullYear()} Top Chef Stats. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
