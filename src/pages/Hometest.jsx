import { Link } from "react-router";

export default function Hometest(){
    return(
     <div>
      <h1>Her er hubben</h1>
      <nav>
        <ul>
          <li><Link to="/map">Map</Link></li>
          <li><Link to="/login">Login</Link></li>
          <li><Link to="/discover">Discover</Link></li>
          <li><Link to="/opretpost">Opret Post</Link></li>
          
        </ul>
      </nav>
    </div>
  );
}