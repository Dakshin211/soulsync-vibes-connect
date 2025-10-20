import { getDatabase } from 'firebase/database';
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: "AIzaSyBUl9xPneLDA1ZT_rRjWIiTpZ7HXIiKPwo",
  authDomain: "soulsync-app-119.firebaseapp.com",
  projectId: "soulsync-app-119",
  storageBucket: "soulsync-app-119.firebasestorage.app",
  messagingSenderId: "503234048267",
  appId: "1:503234048267:web:0d5cddda4c797176ecb20e",
  measurementId: "G-WL0R740RJW",
  databaseURL: "https://soulsync-app-119-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig, 'realtimeApp');
export const realtimeDb = getDatabase(app);
