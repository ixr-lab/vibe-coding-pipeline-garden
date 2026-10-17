/* Reproduce the v13 floating-leaf timing and verify the v14 renderer timing.
 * Run from any directory: node scripts/ink_growth_check.cjs
 * Uses the real v13 engine from Git and the current engine/renderer helper.
 * This is a geometry/timing check, not a browser raster measurement.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {execFileSync}=require('node:child_process'),{createHash}=require('node:crypto');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trimEnd();
const hash=text=>createHash('sha256').update(text.replace(/\r\n/g,'\n')).digest('hex');
const oldEngineText=git('show','v13:engine.js'),oldRendererText=git('show','v13:plant-renderer.js');
const engineText=fs.readFileSync(path.join(root,'engine.js'),'utf8'),rendererText=fs.readFileSync(path.join(root,'plant-renderer.js'),'utf8');
const oldBox={module:{exports:{}}};vm.runInNewContext(oldEngineText,oldBox);
const oldE=oldBox.module.exports,E=require(path.join(root,'engine.js'));
const rendererBox={window:{},GardenEngine:E};vm.runInNewContext(rendererText,rendererBox);
const R=rendererBox.window.PlantRenderer;
assert.equal(typeof R.foliageGrowth,'function');
const settings={seed:'271828',index:2,density:7,x:.5,y:.9,size:1.16,width:1000,height:778,age:2.125,group:'body-2',leaf_index:1};
function fixture(engine){
  const plant=engine.createInkPlant(settings.seed,settings.index,settings.x,settings.y,settings.density);plant.size=settings.size;
  return {plant,group:plant.leafGroups.find(g=>g.id===settings.group),scale:engine.layout(plant,settings.width,settings.height).scale};
}
const old=fixture(oldE),current=fixture(E),sampleIntervals=1000;
function nearestGap(engine,group,growth,scale){
  let minimum=Infinity;
  const leaf=group.leaves[settings.leaf_index];
  for(let i=0;i<=sampleIntervals;i++){
    const p=engine.pointOnCurve(group.petiole,i/sampleIntervals*growth);
    minimum=Math.min(minimum,Math.hypot(p.x-leaf.x,p.y-leaf.y));
  }
  return minimum*scale;
}
// These are the v13 renderer's actual timing expressions. v13 did not expose
// a timing helper; source hashes below identify the expressions being compared.
const oldPetiole=oldE.clamp((settings.age-old.group.start*3)/.72,0,1);
const oldLeaf=oldE.clamp((settings.age-old.group.leaves[settings.leaf_index].start*3)/.8,0,1);
const atProblemAge=R.foliageGrowth(current.group,settings.age);
const firstVisibleAge=Math.ceil((current.group.leaves[settings.leaf_index].start*3+.72)*8)/8;
const atFirstVisibleAge=R.foliageGrowth(current.group,firstVisibleAge);
const mature=R.foliageGrowth(current.group,6);
let visibleSamples=0,unsupportedSamples=0;
for(const group of current.plant.leafGroups)for(let tick=0;tick<=96;tick++){
  const growth=R.foliageGrowth(group,tick/16);
  for(const amount of growth.leaves)if(amount>0){visibleSamples++;if(growth.petiole<1)unsupportedSamples++;}
}
const checks=[
  {name:'v13 reproduces an exposed leaf before its petiole reaches the node',pass:oldLeaf>0&&oldPetiole<1},
  {name:'v14 hides the former floating leaf at 2.125 seconds',pass:atProblemAge.leaves[settings.leaf_index]===0},
  {name:'the petiole is complete at the first visible 8Hz leaf sample',pass:atFirstVisibleAge.petiole===1&&atFirstVisibleAge.leaves[settings.leaf_index]>0},
  {name:'all revealed leaves have a completed petiole throughout sampled growth',pass:visibleSamples>0&&unsupportedSamples===0},
  {name:'mature petiole and leaves still reach full growth',pass:mature.petiole===1&&mature.leaves.every(amount=>amount===1)}
];
const result={
  recorded_at:new Date().toISOString(),
  source_versions:{
    previous:{version:'v13',commit:git('rev-parse','v13'),engine_sha256:hash(oldEngineText),renderer_sha256:hash(oldRendererText)},
    current:{version:'v14',source:'current workspace files',engine_sha256:hash(engineText),renderer_sha256:hash(rendererText),engine_unchanged_from_v13:hash(engineText)===hash(oldEngineText)}
  },
  method:{kind:'geometry and actual renderer timing helper',previous_timing:'v13 renderer expressions evaluated using its Git-tagged engine data',current_timing:'PlantRenderer.foliageGrowth called from current plant-renderer.js',distance:'minimum Euclidean distance from the final leaf node to the currently revealed petiole quadratic, multiplied by isotropic layout scale',curve_sample_intervals:sampleIntervals,curve_sample_points:sampleIntervals+1,growth_sample_interval_seconds:1/16,growth_sample_range_seconds:[0,6],first_visible_age_sampling_hz:8,raster_measurement:false},
  settings,
  previous:{petiole_growth:oldPetiole,leaf_growth:oldLeaf,nearest_gap_pixels:nearestGap(oldE,old.group,oldPetiole,old.scale)},
  current:{at_problem_age:atProblemAge,leaf_drawn_at_problem_age:atProblemAge.leaves[settings.leaf_index]>0,nearest_gap_at_problem_age_pixels:null,first_visible_age:firstVisibleAge,first_visible_growth:atFirstVisibleAge,nearest_gap_at_first_visible_age_pixels:nearestGap(E,current.group,atFirstVisibleAge.petiole,current.scale),mature_growth:mature,visible_leaf_samples:visibleSamples,unsupported_visible_leaf_samples:unsupportedSamples},
  limitations:['The distance is sampled geometry, not an actual Chrome pixel distance.','A hidden leaf has no rendered gap; its problem-age gap is recorded as null.','Nearest-point sampling may leave a small residual when the petiole is complete.'],
  checks,passed:checks.filter(c=>c.pass).length,total:checks.length
};
const target=path.join(root,'evidence','ink','growth-connection.json');
fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({evidence:'evidence/ink/growth-connection.json',previous_gap_pixels:result.previous.nearest_gap_pixels,current_leaf_drawn:result.current.leaf_drawn_at_problem_age,first_visible_age:firstVisibleAge,first_visible_gap_pixels:result.current.nearest_gap_at_first_visible_age_pixels,passed:result.passed,total:result.total},null,2));
assert.ok(checks.every(c=>c.pass));
