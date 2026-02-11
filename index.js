// index.js - Entry point con polyfills

// Suprimir console.log en producción
if (!__DEV__) {
	console.log = () => {};
	console.warn = () => {};
	console.debug = () => {};
	// Mantener console.error para errores críticos
}

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
