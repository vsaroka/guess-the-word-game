/* Pictograms (emoji) for vocabulary entries, keyed by the English word. Abstract words have none. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Pictos = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var MAP = {
    'house':'🏠','water':'💧','bread':'🍞','cat':'🐱','dog':'🐶','book':'📖','sun':'☀️','moon':'🌙','tree':'🌳',
    'milk':'🥛','apple':'🍎','mother':'👩','father':'👨','friend':'🤝','school':'🏫','car':'🚗','city':'🏙️','flower':'🌸','window':'🪟',
    'door':'🚪','street':'🛣️','child':'🧒','wine':'🍷','cheese':'🧀','money':'💰','work':'💼','time':'⏰','hand':'✋',
    'man':'👨','woman':'👩','boy':'👦','girl':'👧','brother':'👦','sister':'👧','son':'👦','daughter':'👧','family':'👪','name':'🏷️',
    'world':'🌍','country':'🗺️','village':'🏘️','river':'🏞️','lake':'🏞️','fire':'🔥','earth':'🌍','star':'⭐','sky':'🌤️','wind':'💨',
    'light':'💡','colour':'🎨','red':'🟥','blue':'🟦','green':'🟩','yellow':'🟨','black':'⬛','white':'⬜','hot':'🥵','cold':'🥶',
    'happy':'😀','sad':'😢','tired':'😴','sick':'🤒','hungry':'🤤','to eat':'🍴','to drink':'🥤','to sleep':'😴','to go':'🚶','to see':'👀',
    'to hear':'👂','to speak':'🗣️','to read':'📖','to write':'✍️','to run':'🏃','to play':'🎮','to laugh':'😂','to cry':'😭','to sing':'🎤','to dance':'💃',
    'to buy':'🛒','to sell':'🏷️','to learn':'🎓','to teach':'👩‍🏫','to open':'📂','to close':'🔒','to give':'🎁','to find':'🔍','to look for':'🔎','to think':'🤔',
    'to love':'❤️','to wait':'⌛','to help':'🆘','to bring':'📦','question':'❓','answer':'✅','idea':'💡','language':'💬','number':'🔢','letter':'✉️',
    'picture':'🖼️','music':'🎵','song':'🎶','movie':'🎬','game':'🎲','ball':'⚽','phone':'📱','computer':'💻','bag':'👜','bottle':'🍾',
    'glass':'🥛','cup':'☕','plate':'🍽️','knife':'🔪','fork':'🍴','spoon':'🥄','meat':'🥩','egg':'🥚','rice':'🍚','soup':'🍲',
    'coffee':'☕','tea':'🍵','beer':'🍺','juice':'🧃','potato':'🥔','tomato':'🍅','onion':'🧅','banana':'🍌','orange':'🍊','pear':'🍐',
    'grape':'🍇','strawberry':'🍓','cherry':'🍒','vegetable':'🥦','fruit':'🍓','butter':'🧈','honey':'🍯','pasta':'🍝','pig':'🐷','cow':'🐮',
    'sheep':'🐑','goat':'🐐','chicken':'🐔','mouse':'🐭','bear':'🐻','wolf':'🐺','fox':'🦊','lion':'🦁','elephant':'🐘','monkey':'🐒',
    'snake':'🐍','bee':'🐝','duck':'🦆','rabbit':'🐰','body':'🧍','mouth':'👄','ear':'👂','tooth':'🦷','hair':'💇','face':'🙂',
    'finger':'☝️','blood':'🩸','voice':'🔊','love':'❤️','joy':'😄','fear':'😨','luck':'🍀','war':'⚔️','strength':'💪','holiday':'🏖️',
    'hotel':'🏨','restaurant':'🍽️','market':'🛍️','shop':'🏪','bank':'🏦','post office':'📮','church':'⛪','park':'🌳','garden':'🌷','kitchen':'🍳',
    'bathroom':'🛁','roof':'🏠','wall':'🧱','stairs':'🪜','cellar':'🍷','watch':'⌚','hour':'🕐','minute':'⏱️','morning':'🌅','evening':'🌆',
    'summer':'🏖️','winter':'⛄','spring':'🌱','autumn':'🍂','one':'1️⃣','two':'2️⃣','three':'3️⃣','four':'4️⃣','five':'5️⃣','six':'6️⃣',
    'seven':'7️⃣','eight':'8️⃣','nine':'9️⃣','ten':'🔟','heart':'❤️','eye':'👁️','nose':'👃','night':'🌃','day':'🌞','week':'📅',
    'year':'🗓️','foot':'🦶','shoe':'👟','shirt':'👕','trousers':'👖','dress':'👗','hat':'🎩','room':'🛋️','bed':'🛏️','chair':'🪑',
    'lamp':'💡','cloud':'☁️','mirror':'🪞','cake':'🍰','sugar':'🍬','salt':'🧂','newspaper':'📰','key':'🔑','rain':'🌧️','snow':'❄️',
    'bird':'🐦','fish':'🐟','horse':'🐴','train':'🚆','airport':'🛫','station':'🚉','hospital':'🏥','doctor':'🧑‍⚕️','bridge':'🌉','mountain':'⛰️',
    'sea':'🌊','forest':'🌲','island':'🏝️','breakfast':'🥐','gift':'🎁','birthday':'🎂','wedding':'💒','trip':'🧳','apartment':'🏢',
    'bicycle':'🚲','bus':'🚌','ship':'🚢','airplane':'✈️','ticket':'🎫','suitcase':'🧳','passport':'🛂','map':'🗺️','museum':'🏛️','theatre':'🎭',
    'library':'📚','university':'🎓','office':'🏢','factory':'🏭','farm':'🚜','police':'👮','soldier':'💂','teacher':'👩‍🏫','cook':'🧑‍🍳','farmer':'🧑‍🌾',
    'driver':'🚕','artist':'🧑‍🎨','pupil':'🧑‍🎓','king':'🤴','queen':'👸','guest':'🛎️','boss':'🕴️','story':'📜','dream':'💭','god':'🙏',
    'death':'💀','law':'⚖️','danger':'⚠️','thirst':'🥵','pain':'🤕','medicine':'💊','traffic':'🚦','noise':'📢','silence':'🤫','shadow':'👤',
    'field':'🌾','beach':'🏖️','wave':'🌊','stone':'🪨','sand':'⏳','grass':'🌿','leaf':'🍃','rose':'🌹','wood':'🪵','iron':'⚙️',
    'gold':'🥇','paper':'📄','pen':'🖊️','scissors':'✂️','soap':'🧼','towel':'🧖','blanket':'🛌','pillow':'🛌','carpet':'🟫','curtain':'🪟',
    'candle':'🕯️','sofa':'🛋️','cupboard':'🗄️','shelf':'📚','glasses':'👓','ring':'💍','jacket':'🧥','coat':'🧥','sock':'🧦','cap':'🧢',
    'skirt':'👗','scarf':'🧣','to build':'🏗️','to carry':'🎒','to wash':'🧽','to cook':'🍳','to drive':'🚗','to fly':'🛩️','to swim':'🏊','to jump':'🤸',
    'to fall':'🍂','to show':'👉','to call':'📞','to pay':'💳','to send':'📤','to die':'⚰️','to begin':'▶️','strong':'💪','rich':'🤑','clean':'✨',
    'dirty':'🐷','loud':'📢','quiet':'🤫','dark':'🌑','bright':'🔆','wet':'💦','dry':'🏜️','sweet':'🍭','sour':'🍋','fresh':'🥬',
    'deep':'🕳️','high':'🗼','near':'📍','far':'🔭','free':'🕊️','dangerous':'☠️','fast':'🐇','slow':'🐢','big':'🐘','small':'🐜',
    'old':'👴','young':'👶','full':'🈵','empty':'🈳','expensive':'💎','cheap':'🏷️','long':'📏','weak':'🥱','poor':'🪙','government':'🏛️',
    'environment':'🌿','umbrella':'☂️','fridge':'🧊','glove':'🧤','belt':'🪢','thunderstorm':'⛈️','butterfly':'🦋','squirrel':'🐿️','lighthouse':'🗼','pumpkin':'🎃',
    'oyster':'🦪','hammock':'🏝️','vacuum cleaner':'🧹','screwdriver':'🪛','mayor':'🎖️','meeting':'👥','contract':'📝','tax':'🧾','salary':'💵','invoice':'🧾',
    'insurance':'🛡️','election':'🗳️','invention':'💡','research':'🔬','science':'🔬','speed':'⚡','past':'⏪','future':'⏩','event':'🎪','childhood':'🧸',
    'landscape':'🏞️','earthquake':'🌋','flood':'🌊','drought':'🏜️','volcano':'🌋','desert':'🏜️','glacier':'🧊','waterfall':'💦','cave':'🕳️','television':'📺',
    'news':'📰','advertisement':'📣','camera':'📷','battery':'🔋','tool':'🔧','hammer':'🔨','nail':'🔩','neighbor':'🏘️','neighbourhood':'🏘️','success':'🏆',
    'adventure':'🧭','balance':'⚖️','justice':'⚖️','health':'🩺','freedom':'🕊️','education':'🎓','truth':'✅','lie':'🤥','trust':'🤝','patience':'⏳',
    'secret':'🤐','surprise':'😲','jealousy':'😒','loneliness':'🧍','mistake':'❌','fun':'🎉','help':'🆘','can':'💪','to stay':'🛑','to win':'🏆','to lose':'😞'
  };
  function forWord(en) { return MAP[en] || ''; }
  return { MAP: MAP, forWord: forWord };
});
