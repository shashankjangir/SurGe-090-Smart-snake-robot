'use strict';

const BrowserPreferences = {
  readTickerPause: () => sessionStorage.getItem('marquee-paused'),
  saveTickerPause: paused => sessionStorage.setItem('marquee-paused', String(paused)),
  readController: id => JSON.parse(localStorage.getItem('surge-controller-v1:' + id) || 'null'),
  saveController: (id, settings) => localStorage.setItem('surge-controller-v1:' + id, JSON.stringify(settings)),
  readPhoneKey: () => localStorage.getItem('surge-phone-key') || '',
  savePhoneKey: key => localStorage.setItem('surge-phone-key', key)
};
