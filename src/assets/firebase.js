// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";


//Er ikke nødvendigt hvis vi kun bruger firestore
//import { getAnalytics } from "firebase/analytics"; 


// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCX1TDi4tAkdsCs_KjZRhFKoDl9XCKPz2k",
  authDomain: "sport-13624.firebaseapp.com",
  //databaseURL: "https://sport-13624-default-rtdb.firebaseio.com",  //Skal kun bruges hvis vi bruger realtime Database
  projectId: "sport-13624",
  storageBucket: "sport-13624.firebasestorage.app",
  messagingSenderId: "351245073345",
  appId: "1:351245073345:web:9a1961d00092ae3bd94d40",
  measurementId: "G-EW7Q2JZJ85"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app); //firestore, der hvor vi har vores arrays med posts, hotspots og users
// const analytics = getAnalytics(app); //Kun nødvendigt hvis vi skal bruge analytics, ikke hvis vi kun bruger firestore