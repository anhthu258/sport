import { useEffect, useState } from "react";
import Filter from "../components/Filter.jsx";
import { db } from "../assets/firebase.js";
import { collection, getDocs } from "firebase/firestore";
import "../Styling/Filtertest.css";

export default function Filtertest() {
  // State til at gemme alle hotspots fra Firestore
  const [hotspots, setHotspots] = useState([]);
  // State til at gemme alle posts fra Firestore
  const [posts, setPosts] = useState([]);
  // State til at gemme filtrerede og sorterede hotspots
  const [filteredHotspots, setFilteredHotspots] = useState([]);
  // State til at holde styr på loading status
  const [loading, setLoading] = useState(true);
  // State til at gemme den valgte sportsgren
  const [selectedSport, setSelectedSport] = useState(null);

  // Helper function til at få det rigtige billede for hver lokation
  const getLocationImage = (hotspot) => {
    // Hvis hotspot allerede har et img felt, brug det
    if (hotspot.img) return hotspot.img;

    // Mapping af lokationer til deres billeder
    const locationImageMap = {
      DOKK1: "/img/LokationImg/dokk123.png",
      Havnen: "/img/LokationImg/havnen.jpg",
      Navitas: "/img/LokationImg/navitas.jpg",
      Island: "/img/LokationImg/navitas.jpg",
      Frederiksbergsvoemmehal:
        "/img/LokationImg/frederiksbergidraetscenter.jpg",
      Frederiksbergskole: "/img/LokationImg/frederiksbergskole.jpg",
    };

    // Tjek først eksakt match på navn eller id
    const locationName = hotspot.name || hotspot.id || "";
    if (locationImageMap[locationName]) {
      return locationImageMap[locationName];
    }

    // Tjek case-insensitive match
    const lowerName = locationName.toLowerCase();
    for (const [key, value] of Object.entries(locationImageMap)) {
      if (lowerName === key.toLowerCase()) {
        return value;
      }
    }

    // Fallback: returner første billede
    return "/img/LokationImg/dokk123.png";
  };

  // Hent både hotspots og posts fra Firestore når komponenten loader
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const hotspotsSnap = await getDocs(collection(db, "hotspots"));
        const hotspotsList = hotspotsSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() || {}),
        }));

        const postsSnap = await getDocs(collection(db, "posts"));
        const postsList = postsSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() || {}),
        }));

        if (!cancelled) {
          setHotspots(hotspotsList);
          setPosts(postsList);
        }
      } catch (err) {
        console.error("Failed to load data", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Filtrer og sorter hotspots baseret på valgt sportsgren og antal posts
  useEffect(() => {
    // Tæl posts per hotspot for den valgte sport
    const postCountByHotspot = {};
    const relevantPosts = selectedSport
      ? posts.filter((post) => post.sport === selectedSport)
      : posts;

    relevantPosts.forEach((post) => {
      if (post.hotspotId) {
        postCountByHotspot[post.hotspotId] =
          (postCountByHotspot[post.hotspotId] || 0) + 1;
      }
    });

    // Filtrer hotspots baseret på sportsgren
    let filtered = hotspots;
    if (selectedSport) {
      filtered = hotspots.filter((hotspot) => {
        const sportsgren = hotspot.sportsgren || hotspot.sports || [];
        return Array.isArray(sportsgren) && sportsgren.includes(selectedSport);
      });
    }

    // Tilføj post count og sorter
    const hotspotsWithCount = filtered.map((hotspot) => ({
      ...hotspot,
      postCount: postCountByHotspot[hotspot.id] || 0,
    }));

    hotspotsWithCount.sort((a, b) => {
      if (b.postCount !== a.postCount) {
        return b.postCount - a.postCount;
      }
      return (a.name || a.id || "").localeCompare(b.name || b.id || "");
    });

    setFilteredHotspots(hotspotsWithCount);
  }, [hotspots, posts, selectedSport]);

  return (
    <div className="filtertest-root">
      <div className="filtertest-header">
        <h1>Opdage</h1>

        {/* Filter komponent med ikoner som i TestingMAPSTUFF */}
        <div className="filtertest-activities">
          <Filter
            selectedSport={selectedSport}
            onFilterChange={({ sportId }) => setSelectedSport(sportId)}
            sports={[
              {
                id: "Basketball",
                name: "",
                icon: (
                  <>
                    <img
                      src="/img/basketball-white.png"
                      alt="Basketball"
                      className="filter-icon-default"
                    />
                    <img
                      src="/img/basketball-black.png"
                      alt="Basketball"
                      className="filter-icon-active"
                    />
                  </>
                ),
              },
              {
                id: "Volleyball",
                name: "",
                icon: (
                  <>
                    <img
                      src="/img/volley-white.png"
                      alt="Volleyball"
                      className="filter-icon-default"
                    />
                    <img
                      src="/img/volley-black.png"
                      alt="Volleyball"
                      className="filter-icon-active"
                    />
                  </>
                ),
              },
              {
                id: "Fodbold",
                name: "",
                icon: (
                  <>
                    <img
                      src="/img/fodbold-white.png"
                      alt="Fodbold"
                      className="filter-icon-default"
                    />
                    <img
                      src="/img/fodbold-black.png"
                      alt="Fodbold"
                      className="filter-icon-active"
                    />
                  </>
                ),
              },
              {
                id: "Tennis",
                name: "",
                icon: (
                  <>
                    <img
                      src="/img/tennis-white.png"
                      alt="Tennis"
                      className="filter-icon-default"
                    />
                    <img
                      src="/img/tennis-black.png"
                      alt="Tennis"
                      className="filter-icon-active"
                    />
                  </>
                ),
              },
            ]}
          />
        </div>
      </div>

      <div className="filtertest-content">
        {loading ? (
          <div className="filtertest-loading">Indlæser...</div>
        ) : filteredHotspots.length === 0 ? (
          <div className="filtertest-empty">
            Ingen lokationer fundet for den valgte sport.
          </div>
        ) : (
          <div className="filtertest-location-list">
            {/* Vis hvert hotspot med billede og info */}
            {filteredHotspots.map((hotspot) => (
              <article key={hotspot.id} className="location-card">
                <div className="location-image-wrapper">
                  <img
                    src={getLocationImage(hotspot)}
                    alt={hotspot.name || "Location"}
                    className="location-image"
                  />
                  <div className="location-overlay">
                    <h2 className="location-name">
                      {hotspot.name || hotspot.id || "Unnamed Location"}
                    </h2>
                    <div className="location-stats">
                      <div className="location-active">
                        <span className="active-count">
                          {hotspot.activeplayers?.length || 0}
                        </span>{" "}
                        aktive
                      </div>
                      <div className="location-posts">
                        <span className="posts-count">{hotspot.postCount}</span>{" "}
                        opslag
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
