const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {AnimatePresence,motion}=require('framer-motion');

test('Start mounts the console picker through AnimatePresence and enables submission after selection',async()=>{
  const slots=[];let cursor=0,effects=[],requests=0;
  const react={...React,
    useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];},
    useEffect(fn,deps){const i=cursor++;if(!slots[i]){slots[i]=true;effects.push(fn);}},
    useMemo(fn){return fn();},
  };
  const stub=()=>null;
  const modules={
    react,'react/jsx-runtime':require('react/jsx-runtime'),'react-dom':require('react-dom'),
    'framer-motion':{AnimatePresence,motion},'date-fns':require('date-fns'),
    '@/components/ui/card':{Card:({children})=>React.createElement('div',null,children)},
    '@/src/config/env':{DASHBOARD_URL:'https://example.test',BOOKING_URL:'https://example.test'},
    '../context/SocketContext':{useSocket:()=>({socket:null,isConnected:false})},
    '@/app/hooks/useApiClient':{useApiClient:()=>({get:async()=>{requests++;return [{consoleId:9,brand:'PC 9',is_available:true}];}})},
    './ResponsiveSearchFilter':{default:stub},'./mealsDetailmodal':{default:stub},
    'lucide-react':new Proxy({},{get:()=>stub}),
    '@fortawesome/react-fontawesome':{FontAwesomeIcon:stub},'@fortawesome/free-solid-svg-icons':{},
  };
  const output={};
  const code=ts.transpileModule(fs.readFileSync('app/components/upcoming-booking.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;
  vm.runInNewContext(code,{exports:output,require:name=>{assert.ok(name in modules,name);return modules[name];},console:{log(){},warn(){},error(){}},Date,document:{body:{nodeType:1}},setTimeout});
  const booking={bookingId:42,game_id:1,consoleType:'PC',username:'Test gamer',date:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata'}).format(new Date()),time:'11:00 PM - 11:30 PM'};
  function render(){cursor=0;const tree=output.UpcomingBookings({upcomingBookings:[booking],vendorId:'1',setRefreshSlots(){}});const pending=effects;effects=[];pending.forEach(fn=>fn());return tree;}
  function find(node,predicate){if(!node||typeof node!=='object')return;if(predicate(node))return node;for(const c of [node.props?.children,node.children].flat(Infinity)){const found=find(c,predicate);if(found)return found;}}
  render();let tree=render();
  const start=find(tree,n=>n.props?.title?.startsWith('Start session'));
  assert.ok(start);start.props.onClick();
  await new Promise(resolve=>setImmediate(resolve));tree=render();
  assert.equal(requests,1);
  const portal=find(tree,n=>n.$$typeof===Symbol.for('react.portal')&&renderToStaticMarkup(n.children).includes('Select console to start session'));
  assert.ok(portal,'Start must produce a visible dialog, not a portal discarded by AnimatePresence');
  const submit=()=>find(tree,n=>n.type===motion.button&&find(n,c=>c.type==='span'&&c.props.children==='Start Session'));
  assert.equal(submit().props.disabled,true);
  find(portal,n=>n.type===motion.div&&n.props.className?.includes('cursor-pointer')).props.onClick();
  tree=render();assert.equal(submit().props.disabled,false);
});
