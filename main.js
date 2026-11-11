import './styles.css';
import { Game } from './game/Game.js';

const game = new Game(document.getElementById('game'));
window.__cyberGuard = game; // konsoldan / testlerden erişim için
