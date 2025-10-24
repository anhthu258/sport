import { Link } from "react-router";

export default function Hometest() {
  return (
    <div className="hubben">
      <h1>Her er hubben</h1>
      <nav>
        <ul>
          <li>
            <a href="/MapAnker.html">Map</a>
          </li>
          <li>
            <Link to="/testing-map">Testing Map (Mapbox)</Link>
          </li>
          <li>
            <Link to="/login">Login</Link>
          </li>
          <li>
            <Link to="/signup">Sign Up</Link>
          </li>
          <li>
            <Link to="/discover">Discover</Link>
          </li>
          <li>
            <Link to="/opretpost">Opret Post</Link>
          </li>
          <li>
            <Link to="/filtertest">Filter Test</Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
