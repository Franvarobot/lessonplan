const App = () => {
  const [plan, setPlan] = React.useState(null);
  const generate = () => setPlan(window.generateLessonPlan());
  return React.createElement('div', {style:{padding:'20px', textAlign:'center'}},
    React.createElement('h1', null, 'Lektionsplaneraren'),
    React.createElement('p', null, 'Full modular version - alla funktioner återställda'),
    React.createElement('button', {onClick: generate, style:{padding:'15px 30px', fontSize:'18px', background:'#2B5F8B', color:'white', border:'none', borderRadius:'8px'}}, 'Generera lektionsplan'),
    plan && React.createElement('div', {style:{marginTop:'20px', background:'#fff', padding:'20px', borderRadius:'8px', textAlign:'left'}}, JSON.stringify(plan, null, 2))
  );
};
window.App = App;
console.log('✅ App loaded');