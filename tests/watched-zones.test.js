import test from 'node:test';import assert from 'node:assert/strict';import {watchedZoneAt} from '../public/watched-zones.js';import fs from 'node:fs';
const zones=JSON.parse(fs.readFileSync(new URL('../public/data/zones.json',import.meta.url))).zones;
test('South African ports are monitored alongside Italy',()=>{assert.equal(zones.filter(z=>z.country==='South Africa').length,8);assert.equal(watchedZoneAt(-29.87,31.03,zones).name,'Durban');assert.equal(watchedZoneAt(44.40,8.91,zones).id,'genova');});
test('offshore and invalid coordinates do not count as watched ports',()=>{assert.equal(watchedZoneAt(-35,20,zones),null);assert.equal(watchedZoneAt(NaN,31,zones),null);});
test('nearby Algoa Bay ports stay distinct',()=>{assert.equal(watchedZoneAt(-33.80,25.68,zones).id,'za-ngqura');assert.equal(watchedZoneAt(-33.96,25.63,zones).id,'za-gqeberha');});
