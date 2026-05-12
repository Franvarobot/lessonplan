const App = () => {
  const [plan, setPlan] = React.useState(null);
  const generate = () => {
    const newPlan = window.generateLessonPlan();
    setPlan(newPlan);
  };
  return React.createElement('div', { style: { maxWidth: '800px', margin: '40px auto', textAlign: 'center' } },
    React.createElement('h1', null, 'Lektionsplaneraren'),
    React.createElement('p', null, 'Modular version - nu fungerar det!'),
    React.createElement('button', {
      onClick: generate,
      style: { padding: '15px 30px', fontSize: '18px', background: '#2B5F8B', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }
    }, 'Generera lektionsplan'),
    plan && React.createElement('div', { style: { marginTop: '30px', background: '#fff', padding: '20px', borderRadius: '8px', textAlign: 'left' } }, JSON.stringify(plan, null, 2))
  );
};
window.App = App;
console.log('✅ App.js loaded');