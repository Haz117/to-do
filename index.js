// index.js - Entry point con polyfills
// Carga variables de entorno desde .env si no estamos en producción ni en entorno Expo
if (!process.env.FIREBASE_API_KEY) {
	try {
		require('dotenv').config();
	} catch (e) {
		// dotenv no está disponible (por ejemplo, en Expo managed)
	}
}
import './polyfills';
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
