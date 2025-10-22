import { useEffect, useState } from "react";
import Filter from "../components/Filter.jsx";
import { db } from "../assets/firebase.js";
import { collection, getDocs } from "firebase/firestore";

export default function Filtertest() {
  // State til at gemme alle posts fra Firestore
  const [posts, setPosts] = useState([]);
  // State til at gemme filtrerede posts
  const [filteredPosts, setFilteredPosts] = useState([]);
  // State til at holde styr på loading status
  const [loading, setLoading] = useState(true);
  // State til at gemme den valgte sportsgren
  const [selectedSport, setSelectedSport] = useState(null);

  // Hent posts fra Firestore når komponenten loader
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Hent alle dokumenter fra "posts" collection
        const snap = await getDocs(collection(db, "posts"));
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
        if (!cancelled) setPosts(list);
      } catch (err) {
        console.error("Failed to load posts", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Filtrer posts baseret på valgt sportsgren
  useEffect(() => {
    if (!selectedSport) {
      setFilteredPosts(posts);
    } else {
      const filtered = posts.filter((p) => (p.sport || "").toString() === selectedSport);
      setFilteredPosts(filtered);
    }
  }, [posts, selectedSport]);

  return (
    <div>
      <h1>Filter Test</h1>

      {/* Filter komponent med fire sportsgrene */}
      <Filter
        selectedSport={selectedSport}
        onFilterChange={({ sportId }) => setSelectedSport(sportId)}
        sports={[
          { id: "Basketball", name: "Basketball" },
          { id: "Fodbold", name: "Fodbold" },
          { id: "Tennis", name: "Tennis" },
          { id: "Volleyball", name: "Volleyball" },
        ]}
      />

      {/* Vis antal filtrerede posts */}
      <h2>Posts ({filteredPosts.length})</h2>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          {/* Vis hver post med basic styling */}
          {filteredPosts.map((post) => (
            <article
              key={post.id}
              style={{
                border: "1px solid #ddd",
                padding: "16px",
                marginBottom: "12px",
              }}
            >
              <h3>{post.title || "Untitled"}</h3>
              <div>{post.sport}</div>
              <p>{post.details || "No details"}</p>
              {post.time && <div>{post.time}</div>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
