import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBZvlM3yaH3EVv9xsdS6NWHGb47ZW3w08M",
    authDomain: "grupo-arquitectura.firebaseapp.com",
    projectId: "grupo-arquitectura",
    storageBucket: "grupo-arquitectura.appspot.com",
    messagingSenderId: "619201428122",
    appId: "1:619201428122:web:eef4c21f4a7869720d3d23"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db }; 