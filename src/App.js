import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [pokemonList, setPokemonList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [allPokemon, setAllPokemon] = useState([]);
  const [offlineMode, setOfflineMode] = useState(false);
  const itemsPerPage = 20;

  // Precache automático cuando hay conexión
  useEffect(() => {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_POKEMON'
      });
    }
  }, []);

  // Cargar Pokémon de una página específica
  const loadPagePokemon = async (allPokemonList, page) => {
    setLoading(true);
    try {
      const startIndex = (page - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const pagePokemon = allPokemonList.slice(startIndex, endIndex);

      const pokemonDetails = await Promise.all(
        pagePokemon.map(async (pokemon) => {
          try {
            const pokemonResponse = await fetch(pokemon.url);
            if (!pokemonResponse.ok) throw new Error('Network error');
            return pokemonResponse.json();
          } catch (error) {
            console.error('Error loading Pokémon details:', error);
            setOfflineMode(true);
            // Pokémon de placeholder para offline
            return {
              id: Math.random(),
              name: pokemon.name,
              sprites: { front_default: 'https://via.placeholder.com/120x120/666/fff?text=⚡' },
              types: [{ type: { name: 'unknown' } }]
            };
          }
        })
      );
      
      setPokemonList(pokemonDetails);
      setCurrentPage(page);
      setLoading(false);
    } catch (error) {
      console.error('Error loading page Pokémon:', error);
      setLoading(false);
      setOfflineMode(true);
    }
  };

  useEffect(() => {
    const fetchAllPokemon = async () => {
      try {
        const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1000');
        if (!response.ok) throw new Error('Network error');
        const data = await response.json();
        setAllPokemon(data.results);
        setTotalPages(Math.ceil(data.results.length / itemsPerPage));
        loadPagePokemon(data.results, 1);
        setOfflineMode(false);
      } catch (error) {
        console.error('Error fetching Pokémon:', error);
        setOfflineMode(true);
        setLoading(false);
        
        // Intentar usar datos locales si existen
        if (allPokemon.length > 0) {
          loadPagePokemon(allPokemon, 1);
        } else {
          // Datos de fallback para demo
          const fallbackData = {
            results: Array.from({ length: 20 }, (_, i) => ({
              name: `pokemon-${i + 1}`,
              url: `https://pokeapi.co/api/v2/pokemon/${i + 1}`
            }))
          };
          setAllPokemon(fallbackData.results);
          setTotalPages(1);
          loadPagePokemon(fallbackData.results, 1);
        }
      }
    };

    fetchAllPokemon();
  }, []);

  // Manejar cambio de página
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      loadPagePokemon(allPokemon, newPage);
    }
  };

  // Filtrar Pokémon según búsqueda
  const filteredPokemon = pokemonList.filter(pokemon => 
    pokemon.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Buscar Pokémon específico
  const handleSearch = async () => {
    if (searchTerm.trim() === '') {
      loadPagePokemon(allPokemon, 1);
      setTotalPages(Math.ceil(allPokemon.length / itemsPerPage));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${searchTerm.toLowerCase()}`);
      if (response.ok) {
        const pokemonData = await response.json();
        setPokemonList([pokemonData]);
        enviarNotificacion(`¡${pokemonData.name} agregado a tu Pokédex!`);
        setCurrentPage(1);
        setTotalPages(1);
        setLoading(false);
        setOfflineMode(false);
      } else {
        throw new Error('Pokémon not found');
      }
    } catch (error) {
      console.error('Error searching Pokémon:', error);
      setOfflineMode(true);
      const filtered = allPokemon.filter(pokemon => 
        pokemon.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setTotalPages(Math.ceil(filtered.length / itemsPerPage));
      loadPagePokemon(filtered, 1);
    }
  };

  const enviarNotificacion = async (mensaje = "Pokédex actualizada") => {
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready;
    if (registration.active) {
      registration.active.postMessage({
        type: "SHOW_NOTIFICATION",
        body: mensaje
      });
    }
  }
};


  // Resetear búsqueda
  const handleReset = () => {
    setSearchTerm('');
    loadPagePokemon(allPokemon, 1);
    setTotalPages(Math.ceil(allPokemon.length / itemsPerPage));
  };

  if (loading && pokemonList.length === 0) {
    return (
      <div className="App">
        <div className="loading">
          <div className="pokeball-loading"></div>
          Cargando Pokémon...
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="header">
        <h1>PokePWA - Tu Pokédex</h1>
        
        <button
  style={{
    padding: "10px 20px",
    borderRadius: "10px",
    background: "#2196F3",
    color: "white",
    border: "none",
    cursor: "pointer",
    marginBottom: "15px"
  }}
  onClick={() => {
    if ("Notification" in window) {
      Notification.requestPermission().then((res) => {
        console.log("Permiso de notificación:", res);
      });
    }
  }}
>
  Activar notificaciones
</button>


        {/* ✅ BANNER OFFLINE */}
        {offlineMode && (
          <div className="offline-banner">
            ⚠️ Modo offline - Mostrando datos cacheados
          </div>
        )}
        
        <div className="search-container">
          <input
            type="text"
            placeholder="Buscar Pokémon por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="search-input"
          />
          <button onClick={handleSearch} className="search-button">
            Buscar
          </button>
          <button onClick={handleReset} className="reset-button">
            Reset
          </button>
        </div>
      </header>
      
      <div className="page-info">
        <p>
          Página {currentPage} de {totalPages} 
          {searchTerm && ` - Búsqueda: "${searchTerm}"`}
        </p>
        <p>Mostrando {filteredPokemon.length} Pokémon</p>
      </div>

      <div className="pokemon-grid">
        {filteredPokemon.length > 0 ? (
          filteredPokemon.map((pokemon) => (
            <div key={pokemon.id} className="pokemon-card">
              <img 
                src={pokemon.sprites.front_default} 
                alt={pokemon.name}
                className="pokemon-image"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/120x120/333/fff?text=?';
                }}
              />
              <h3 className="pokemon-name">
                {pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}
              </h3>
              <p className="pokemon-id">#{pokemon.id.toString().padStart(3, '0')}</p>
              <div className="pokemon-types">
                {pokemon.types.map(typeInfo => (
                  <span key={typeInfo.type.name} className={`type ${typeInfo.type.name}`}>
                    {typeInfo.type.name}
                  </span>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="no-results">
            <p>No se encontraron Pokémon que coincidan con "{searchTerm}"</p>
            <button onClick={handleReset} className="reset-button">
              Ver todos los Pokémon
            </button>
          </div>
        )}
      </div>

      {totalPages > 1 && filteredPokemon.length > 0 && (
        <div className="pagination">
          <button 
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="pagination-button"
          >
            ⏮️ Primera
          </button>
          <button 
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-button"
          >
            ◀️ Anterior
          </button>
          
          <div className="page-numbers">
            {[...Array(Math.min(5, totalPages))].map((_, index) => {
              const pageNum = Math.max(1, currentPage - 2) + index;
              if (pageNum <= totalPages) {
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`pagination-number ${currentPage === pageNum ? 'active' : ''}`}
                  >
                    {pageNum}
                  </button>
                );
              }
              return null;
            })}
          </div>

          <button 
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            Siguiente ▶️
          </button>
          <button 
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            Última ⏭️
          </button>
        </div>
      )}

      {loading && pokemonList.length > 0 && (
        <div className="loading-overlay">
          <div className="loading">Cargando...</div>
        </div>
      )}
    </div>
  );
}

export default App;