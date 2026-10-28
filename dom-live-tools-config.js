/* global window */
(() => {
  // Fixed owner-approved deployments for the portfolio and its private previews.
  const portfolioOrigins = ['https://shoegun.github.io', 'http://127.0.0.1:4179', 'http://localhost:4179', 'https://desktop-6he0t2k.taile5e8da.ts.net:10443'];
  if (!portfolioOrigins.includes(window.location.origin)) return;
  window.DomLiveTools?.configure({
    henrys: {
      url: 'https://script.google.com/macros/s/AKfycbwSJ_ttPRhSOsEq_fV1ShjZm_56tGutS436zfPz0Re_40Rx2DxreC1-Qs-zEcui7ZQr/exec',
      origin: 'https://n-5owonli3smpnswy6g7gfssdybqazfauqgtpcr2y-0lu-script.googleusercontent.com'
    },
    kepler: {
      url: 'https://script.google.com/macros/s/AKfycbyCSMyu_3Knjv0sq-UBT7SdF3fV9TfkILObnqfiauo5LgqpV5i_WbmtHU6AqWFVmtLj/exec',
      origin: 'https://n-745rrmpbcmtnrnfe4ghp6ayuxmazfauqgtpcr2y-0lu-script.googleusercontent.com'
    }
  });
})();
