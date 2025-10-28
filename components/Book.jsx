import React, { useEffect, useState, useRef } from "react";
import { FaHeart, FaSearch, FaTrash, FaBookOpen } from "react-icons/fa";
import "./Book.css";

const Book = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [numFound, setNumFound] = useState(0);
  const [authorFilter, setAuthorFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [view, setView] = useState("search");
  const [favorites, setFavorites] = useState(() => {
    const raw = localStorage.getItem("bf_favorites_v1");
    return raw ? JSON.parse(raw) : [];
  });

  const timerRef = useRef(null);
  const lastQueryRef = useRef("");

  useEffect(() => {
    localStorage.setItem("bf_favorites_v1", JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim()) {
      setResults([]);
      setNumFound(0);
      setPage(1);
      setError(null);
      return;
    }
    timerRef.current = setTimeout(() => {
      setPage(1);
      fetchResults(query, 1);
    }, 500);

    return () => clearTimeout(timerRef.current);
  }, [query]);

  useEffect(() => {
    if (!query.trim()) return;
    if (lastQueryRef.current === query) {
      fetchResults(query, page);
    } else {
      lastQueryRef.current = query;
    }
  }, [page]);

  async function fetchResults(q, p = 1) {
    setLoading(true);
    setError(null);
    try {
      const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(
        q
      )}&page=${p}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setNumFound(data.numFound || 0);
      const docs = (data.docs || []).map((d) => ({
        key: d.key,
        title: d.title,
        author_name: d.author_name || [],
        first_publish_year: d.first_publish_year,
        cover_i: d.cover_i,
      }));

      const filtered = docs.filter((doc) => {
        if (
          authorFilter &&
          !doc.author_name
            .join(" ")
            .toLowerCase()
            .includes(authorFilter.toLowerCase())
        )
          return false;
        if (yearFilter && String(doc.first_publish_year) !== String(yearFilter))
          return false;
        return true;
      });

      setResults(filtered);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function addFavorite(book) {
    setFavorites((prev) => {
      if (prev.find((b) => b.key === book.key)) return prev;
      return [book, ...prev];
    });
  }

  function removeFavorite(key) {
    setFavorites((prev) => prev.filter((b) => b.key !== key));
  }

  function isFavorited(key) {
    return favorites.some((b) => b.key === key);
  }

  function coverUrl(cover_i) {
    return cover_i
      ? `https://covers.openlibrary.org/b/id/${cover_i}-M.jpg`
      : null;
  }

  const totalPages = Math.max(1, Math.ceil(numFound / 100));

  return (
    <div className="book-app">
      <nav className="navbar">
        <h2 className="logo">
          <FaBookOpen className="icon" /> Book Finder
        </h2>
        <div className="nav-buttons">
          <button
            className={`nav-btn ${view === "search" ? "active" : ""}`}
            onClick={() => setView("search")}
          >
            <FaSearch /> Search
          </button>
          <button
            className={`nav-btn ${view === "favorites" ? "active" : ""}`}
            onClick={() => setView("favorites")}
          >
            <FaHeart /> Favorites{" "}
            <span className="fav-count">{favorites.length}</span>
          </button>
        </div>
      </nav>

      <form
        className="search-bar"
        onSubmit={(e) => {
          e.preventDefault();
          fetchResults(query, 1);
        }}
      >
        <input
          type="search"
          placeholder="Search by title..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit">
          <FaSearch /> Search
        </button>
      </form>

      {view === "search" && (
        <>
          <div className="filters">
            <input
              placeholder="Filter author"
              value={authorFilter}
              onChange={(e) => setAuthorFilter(e.target.value)}
            />
            <input
              placeholder="Filter year"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
            />
            <button
              className="clear-btn"
              onClick={() => {
                setAuthorFilter("");
                setYearFilter("");
              }}
            >
              <FaTrash /> Clear
            </button>
          </div>

          {loading && <div className="alert info">Loading...</div>}
          {error && <div className="alert error">Error: {error}</div>}

          <div className="grid">
            {results.map((book) => (
              <div className="card" key={book.key}>
                {book.cover_i ? (
                  <img src={coverUrl(book.cover_i)} alt={book.title} />
                ) : (
                  <div className="no-cover">No cover</div>
                )}
                <div className="card-body">
                  <h5>{book.title}</h5>
                  <p>
                    <strong>Author:</strong>{" "}
                    {book.author_name.join(", ") || "Unknown"}
                  </p>
                  <p>
                    <strong>Year:</strong> {book.first_publish_year || "—"}
                  </p>
                  <div className="card-actions">
                    <a
                      href={`https://openlibrary.org${book.key}`}
                      target="_blank"
                      rel="noreferrer"
                      className="open-btn"
                    >
                      <FaBookOpen /> Open
                    </a>
                    {isFavorited(book.key) ? (
                      <button
                        className="remove-btn"
                        onClick={() => removeFavorite(book.key)}
                      >
                        <FaTrash /> Remove
                      </button>
                    ) : (
                      <button
                        className="save-btn"
                        onClick={() => addFavorite(book)}
                      >
                        <FaHeart /> Save
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {numFound > 0 && (
            <div className="pagination">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ⬅ Prev
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next ➡
              </button>
            </div>
          )}
        </>
      )}

      {view === "favorites" && (
        <div className="favorites">
          <h3>Your Favorites</h3>
          {favorites.length === 0 && (
            <div className="alert info">No favorites yet.</div>
          )}
          <div className="grid">
            {favorites.map((book) => (
              <div className="card" key={book.key}>
                {book.cover_i ? (
                  <img src={coverUrl(book.cover_i)} alt={book.title} />
                ) : (
                  <div className="no-cover">No cover</div>
                )}
                <div className="card-body">
                  <h5>{book.title}</h5>
                  <p>
                    <strong>Author:</strong>{" "}
                    {book.author_name.join(", ") || "Unknown"}
                  </p>
                  <div className="card-actions">
                    <a
                      href={`https://openlibrary.org${book.key}`}
                      target="_blank"
                      rel="noreferrer"
                      className="open-btn"
                    >
                      <FaBookOpen /> Open
                    </a>
                    <button
                      className="remove-btn"
                      onClick={() => removeFavorite(book.key)}
                    >
                      <FaTrash /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <footer className="footer">
        📘 Built for Alex — College Student. Data from Open Library.
      </footer>
    </div>
  );
};

export default Book;
