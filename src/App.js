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

  // ✅ Notificaciones (siempre arriba)
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

  // ✅ Pre-cache cuando hay conexión
  useEffect(() => {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_POKEMON'
      });
    }
  }, []);

  // ✅ Cargar Pokémon por página
  const loadPagePokemon = async (allPokemonList, page) => {
    setLoading(true);
    try {
      const startIndex = (page - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const pagePokemon = allPokemonList.slice(startIndex, endIndex);

      const pokemonDetails = await Promise.all(
        pagePokemon.map(async (pokemon) => {
          try {
            const res = await fetch(pokemon.url);
            if (!res.ok) throw new Error("Network error");
            return res.json();
          } catch (error) {
            console.error("Error loading Pokémon:", error);
            setOfflineMode(true);
            return {
              id: Math.random(),
              name: pokemon.name,
              sprites: {
                front_default: "https://via.placeholder.com/120x120/666/fff?text=⚡"
              },
              types: [{ type: { name: "unknown" } }]
            };
          }
        })
      );

      setPokemonList(pokemonDetails);
      setCurrentPage(page);
      setLoading(false);

    } catch (error) {
      console.error("Error loading page:", error);
      setLoading(false);
      setOfflineMode(true);
    }
  };

  // ✅ Cargar todo el listado al inicio
  useEffect(() => {
    const fetchAllPokemon = async () => {
      try {
        const res = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1000");
        if (!res.ok) throw new Error("Network error");

        const data = await res.json();
        setAllPokemon(data.results);
        setTotalPages(Math.ceil(data.results.length / itemsPerPage));
        loadPagePokemon(data.results, 1);
        setOfflineMode(false);

      } catch (error) {
        console.error("Fetch error:", error);
        setOfflineMode(true);
        setLoading(false);

        if (allPokemon.length > 0) {
          loadPagePokemon(allPokemon, 1);
        } else {
          const fallback = Array.from({ length: 20 }, (_, i) => ({
            name: `pokemon-${i + 1}`,
            url: `https://pokeapi.co/api/v2/pokemon/${i + 1}`
          }));

          setAllPokemon(fallback);
          setTotalPages(1);
          loadPagePokemon(fallback, 1);
        }
      }
    };

    fetchAllPokemon();
  }, [allPokemon]);

  // ✅ Buscar Pokémon (individual o listado)
  const handleSearch = async () => {
    if (searchTerm.trim() === '') {
      loadPagePokemon(allPokemon, 1);
      setTotalPages(Math.ceil(allPokemon.length / itemsPerPage));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${searchTerm.toLowerCase()}`);

      if (res.ok) {
        const pokemonData = await res.json();
        setPokemonList([pokemonData]);
        enviarNotificacion(`¡${pokemonData.name} agregado a tu Pokédex!`);
        setTotalPages(1);
        setCurrentPage(1);
        setLoading(false);
        setOfflineMode(false);
      } else {
        throw new Error("No encontrado");
      }

    } catch (error) {
      console.error("Search error:", error);
      setOfflineMode(true);

      const filtered = allPokemon.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );

      setTotalPages(Math.ceil(filtered.length / itemsPerPage));
      loadPagePokemon(filtered, 1);
    }
  };

  // ✅ Reset
  const handleReset = () => {
    setSearchTerm('');
    loadPagePokemon(allPokemon, 1);
    setTotalPages(Math.ceil(allPokemon.length / itemsPerPage));
  };

  // ✅ Filtrado visual
  const filteredPokemon = pokemonList.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );


  return (
    <div className="App">
      <header className="header">
        <h1>PokePWA - Tu Pokédex</h1>

        {/* Botón activar notificaciones */}
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
              Notification.requestPermission().then(res =>
                console.log("Permiso:", res)
              );
            }
          }}
        >
          Activar notificaciones
        </button>

        {/* Banner offline */}
        {offlineMode && (
          <div className="offline-banner">
            ⚠️ Modo offline - Mostrando datos cacheados
          </div>
        )}

        {/* Buscador */}
        <div className="search-container">
          <input
            type="text"
            placeholder="Buscar Pokémon..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            className="search-input"
          />

          <button onClick={handleSearch} className="search-button">Buscar</button>
          <button onClick={handleReset} className="reset-button">Reset</button>
        </div>
      </header>

      {/* Info de página */}
      <div className="page-info">
        <p>Página {currentPage} de {totalPages} {searchTerm && ` - "${searchTerm}"`}</p>
        <p>Mostrando {filteredPokemon.length} Pokémon</p>
      </div>

      {/* Grid Pokémon */}
      <div className="pokemon-grid">
        {filteredPokemon.length > 0 ? (
          filteredPokemon.map((pokemon) => (
            <div key={pokemon.id} className="pokemon-card">
              <img
                src={pokemon.sprites.front_default}
                alt={pokemon.name}
                className="pokemon-image"
                onError={(e) => {
                  e.target.src = "https://via.placeholder.com/120x120/333/fff?text=?";
                }}
              />
              <h3 className="pokemon-name">
                {pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}
              </h3>
              <p className="pokemon-id">
                #{pokemon.id.toString().padStart(3, "0")}
              </p>
              <div className="pokemon-types">
                {pokemon.types.map(t => (
                  <span key={t.type.name} className={`type ${t.type.name}`}>
                    {t.type.name}
                  </span>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="no-results">
            <p>No se encontraron Pokémon</p>
            <button onClick={handleReset} className="reset-button">Ver todos</button>
          </div>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && filteredPokemon.length > 0 && (
        <div className="pagination">
          <button
            onClick={() => loadPagePokemon(allPokemon, 1)}
            disabled={currentPage === 1}
            className="pagination-button"
          >
            ⏮️ Primera
          </button>

          <button
            onClick={() => loadPagePokemon(allPokemon, currentPage - 1)}
            disabled={currentPage === 1}
            className="pagination-button"
          >
            ◀️ Anterior
          </button>

          <div className="page-numbers">
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const pageNum = Math.max(1, currentPage - 2) + i;
              if (pageNum <= totalPages) {
                return (
                  <button
                    key={pageNum}
                    onClick={() => loadPagePokemon(allPokemon, pageNum)}
                    className={`pagination-number ${
                      currentPage === pageNum ? "active" : ""
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              }
              return null;
            })}
          </div>

          <button
            onClick={() => loadPagePokemon(allPokemon, currentPage + 1)}
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            Siguiente ▶️
          </button>

          <button
            onClick={() => loadPagePokemon(allPokemon, totalPages)}
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            Última ⏭️
          </button>
        </div>
      )}

      {/* Loader overlay */}
      {loading && pokemonList.length > 0 && (
        <div className="loading-overlay">
          <div className="loading">Cargando...</div>
        </div>
      )}
    </div>
  );
}

export default App;
