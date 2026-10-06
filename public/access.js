(() => {
  const gate=document.getElementById('ideology-gate');
  if(!gate)return;

  const questionEl=document.getElementById('ideology-question');
  const answersEl=document.getElementById('ideology-answers');
  const resultEl=document.getElementById('ideology-result');

  const questions=[
    {q:'The Five-Year Plan has failed. Who is responsible?',a:['The Plan','The economy','A man who has already been arrested'],correct:'A man who has already been arrested',ok:'Correct. Production has therefore recovered.'},
    {q:'There are no potatoes in the shop. Why?',a:['Supply shortage','Bad harvest','Potatoes have temporarily exceeded demand'],correct:'Potatoes have temporarily exceeded demand',ok:'Correct. There is no shortage, only excessive demand.'},
    {q:'Your factory has produced absolutely nothing this month. What is the official output?',a:['0%','73%','118% of target'],correct:'118% of target',ok:'Excellent. The target was exceeded before production began.'},
    {q:'A ship has sunk. What should appear in the report?',a:['Vessel lost','Maritime casualty','Successful transition to submarine operations'],correct:'Successful transition to submarine operations',ok:'Correct. The fleet has diversified.'},
    {q:'A worker says the statistics are false. He is:',a:['Correct','Concerned','Available for immediate reassignment to Siberia'],correct:'Available for immediate reassignment to Siberia',ok:'Correct. Statistical accuracy has been restored.'},
    {q:'The Ministry ordered 10,000 tonnes of steel. You have 300. What do you deliver?',a:['300 tonnes','A request for more steel','A certificate confirming delivery of 10,400 tonnes'],correct:'A certificate confirming delivery of 10,400 tonnes',ok:'Excellent. Logistics solved.'},
    {q:'The railway has not moved for six hours. What is its average speed?',a:['0 km/h','Unknown','Classified'],correct:'Classified',ok:'Correct. Operational performance is a state secret.'},
    {q:'The population is unhappy. What should be increased?',a:['Food production','Wages','The number of posters explaining how happy they are'],correct:'The number of posters explaining how happy they are',ok:'Correct. Public satisfaction has improved immediately.'},
    {q:'A crane has collapsed in the port. The official explanation is:',a:['Mechanical failure','Poor maintenance','Aggressive Western gravity'],correct:'Aggressive Western gravity',ok:'Correct. A diplomatic note is being prepared.'},
    {q:'Your ship is three days late. Which department should be contacted?',a:['Port operations','Shipping management','Statistics'],correct:'Statistics',ok:'Correct. The vessel has now arrived two days early.'},
    {q:'There is a queue of 400 people outside a shop. This proves:',a:['Severe shortages','High demand','The outstanding popularity of Soviet retail'],correct:'The outstanding popularity of Soviet retail',ok:'Correct. Consumer enthusiasm remains strong.'},
    {q:'The engine room is on fire. What is the first priority?',a:['Extinguish the fire','Evacuate the crew','Ensure Moscow does not receive the report before it is corrected'],correct:'Ensure Moscow does not receive the report before it is corrected',ok:'Correct. The situation is now administratively under control.'},
    {q:'An American satellite photographs an empty Soviet port. Your response is:',a:['Admit the port is empty','Deny the photograph','Announce all ships completed the Plan ahead of schedule'],correct:'Announce all ships completed the Plan ahead of schedule',ok:'Correct. The empty port proves total efficiency.'},
    {q:'A regional manager asks for realistic production targets. This indicates:',a:['Good management','Pragmatism','Ideological fatigue'],correct:'Ideological fatigue',ok:'Correct. The manager will receive additional political education.'},
    {q:'What is the difference between a Soviet forecast and a Soviet result?',a:['Accuracy','Time','The result has already been edited'],correct:'The result has already been edited',ok:'Correct. Forecasting is retrospective science.'},
    {q:'The ship requires a spare engine part. When will it arrive?',a:['Tomorrow','Next month','It arrived last quarter according to the inventory'],correct:'It arrived last quarter according to the inventory',ok:'Correct. Please ask the engine to acknowledge receipt.'},
    {q:'The captain reports an iceberg directly ahead. Headquarters orders him to:',a:['Turn port','Reduce speed','Confirm no iceberg exists in the current Five-Year Plan'],correct:'Confirm no iceberg exists in the current Five-Year Plan',ok:'Correct. Navigation may continue.'},
    {q:'What is the safest place to criticize Gosplan?',a:['At home','Among friends','In your thoughts, briefly'],correct:'In your thoughts, briefly',ok:'Correct. Please keep the thought below reportable volume.'},
    {q:'The harvest is the worst in twenty years. Pravda headline:',a:['Poor Harvest Expected','Agricultural Difficulties Continue','Historic Victory in the Battle for Grain'],correct:'Historic Victory in the Battle for Grain',ok:'Correct. Another historic victory has been recorded.'},
    {q:'A Soviet official is asked whether the port has enough cranes. He answers:',a:['No','Almost','Compared with 1913, crane availability has increased 4,700%'],correct:'Compared with 1913, crane availability has increased 4,700%',ok:'Correct. Comparative methodology has saved the port.'},
    {q:'The warehouse contains 50 televisions. The city has 20,000 residents. What is the problem?',a:['Not enough televisions','Distribution','Citizens have developed excessive television expectations'],correct:'Citizens have developed excessive television expectations',ok:'Correct. Demand will be disciplined.'},
    {q:'The captain asks: “Where is our cargo?”',a:['At the terminal','Still on the train','Already delivered in the monthly statistics'],correct:'Already delivered in the monthly statistics',ok:'Correct. Physical delivery is a secondary detail.'},
    {q:'What is the purpose of a Soviet committee?',a:['Make decisions','Solve problems','Determine which other committee caused the problem'],correct:'Determine which other committee caused the problem',ok:'Correct. A subcommittee will confirm this finding.'},
    {q:'A worker exceeds his production quota by 300%. What happens next year?',a:['Promotion','Bonus','His quota increases by 400%'],correct:'His quota increases by 400%',ok:'Correct. Heroism has consequences.'},
    {q:'The Ministry asks whether the new vessel is operational. It has no engine. Your answer:',a:['No','Not yet','Operational capability is proceeding according to schedule'],correct:'Operational capability is proceeding according to schedule',ok:'Correct. The engine is merely a technicality.'},
    {q:'Which statement is scientifically impossible?',a:['A ship can sink','A factory can miss its target','The Communist Party can make a mistake'],correct:'The Communist Party can make a mistake',ok:'Correct. Physics remains ideologically sound.'},
    {q:'A port official discovers the cargo manifest is completely fictional. What should he do?',a:['Correct it','Reject the ship','Check whether the fictional cargo has fulfilled its quota'],correct:'Check whether the fictional cargo has fulfilled its quota',ok:'Correct. Fictional cargo remains subject to planning discipline.'},
    {q:'The USSR has overtaken the United States in steel production. According to which source?',a:['International statistics','Independent economists','The USSR'],correct:'The USSR',ok:'Correct. Independent confirmation is unnecessary.'},
    {q:'Your vessel hits an American aircraft carrier. Who has right of way?',a:['The carrier','The vessel approaching from starboard','History'],correct:'History',ok:'Correct. COLREGs have been referred to the Politburo.'}
  ];

  const wrongMessages=[
    'INCORRECT. Your answer has been forwarded to the appropriate department.',
    'INCORRECT. Please reconsider your relationship with objective reality.',
    'INCORRECT. The Ministry notes an unexpected attachment to facts.',
    'INCORRECT. Ideological calibration required.',
    'INCORRECT. Comrade, the correct answer was already approved.'
  ];

  function shuffle(items){
    const a=[...items];
    for(let i=a.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }

  const item=questions[Math.floor(Math.random()*questions.length)];
  questionEl.textContent=item.q;

  shuffle(item.a).forEach((answer,index)=>{
    const button=document.createElement('button');
    button.type='button';
    button.className='ideology-answer';
    button.innerHTML='<span class="ideology-letter">'+String.fromCharCode(65+index)+'</span><span></span>';
    button.lastElementChild.textContent=answer;
    button.addEventListener('click',()=>{
      if(button.dataset.done==='1')return;
      const all=[...answersEl.querySelectorAll('.ideology-answer')];
      if(answer===item.correct){
        all.forEach(b=>{b.disabled=true;b.dataset.done='1'});
        button.classList.add('correct');
        resultEl.className='ideology-result correct';
        resultEl.textContent='IDEOLOGICAL COMPATIBILITY CONFIRMED. '+item.ok+' Welcome, Comrade.';
        gate.classList.add('approved');
        setTimeout(()=>{
          gate.hidden=true;
          document.body.classList.remove('gate-locked');
        },850);
      }else{
        button.classList.add('wrong');
        button.disabled=true;
        resultEl.className='ideology-result wrong';
        resultEl.textContent=wrongMessages[Math.floor(Math.random()*wrongMessages.length)];
      }
    });
    answersEl.appendChild(button);
  });
})();