import { generate } from './levels.js';
self.onmessage = ({data}) => { try { self.postMessage({ id: data.id, level: generate(data.number, data.seed, data.daily) }); } catch (error) { self.postMessage({ id: data.id, error: String(error) }); } };
