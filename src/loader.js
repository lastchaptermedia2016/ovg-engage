(function() {
  // 1. Skep die houer (container) vir die widget
  const container = document.createElement('div');
  container.id = 'luxe-med-spa-root';
  document.body.appendChild(container);

  // 2. Gebruik Shadow DOM vir styl-isolasie (Kritiek!)
  const shadow = container.attachShadow({ mode: 'open' });
  const renderTarget = document.createElement('div');
  shadow.appendChild(renderTarget);

  // 3. Laai jou Widget se CSS
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://jou-projek.vercel.app'; // Die pad na jou Vercel CSS
  shadow.appendChild(link);

  // 4. Laai die hoof JavaScript van jou widget
  const script = document.createElement('script');
  script.type = 'module';
  script.src = 'https://jou-projek.vercel.app'; // Die pad na jou Vercel JS
  document.body.appendChild(script);

  console.log("✅ The Luxe Med Spa AI Concierge Loaded Successfully");
})();
