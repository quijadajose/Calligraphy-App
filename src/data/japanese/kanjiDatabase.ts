import { Lesson } from '../../types/ink';

export interface KanjiEntry {
  c: string;
  s: number;
  m: string;
  r: string;
}

/**
 * Una entrada por línea: kanji|trazos|lectura|significado.
 * N5 lleva el significado en español; los demás niveles conservan el de la fuente (inglés).
 */
function parse(table: string): KanjiEntry[] {
  return table
    .trim()
    .split('\n')
    .map((line) => {
      const [c, s, r, m] = line.split('|');
      return { c, s: Number(s), r, m };
    });
}

const N5_TABLE = `
日|4|ひ|día, sol
一|1|ひと|uno
国|8|くに|país
人|2|ひと|persona
年|6|とし|año
大|3|おお|grande
十|2|とお|diez
二|2|ふた|dos
本|5|もと|libro, origen
中|4|なか|dentro, medio
長|8|ながい|largo
出|5|でる|salir
三|3|み|tres
時|10|とき|hora, tiempo
行|6|いく|ir
見|7|みる|ver
月|4|つき|luna, mes
後|9|のち|después, detrás
前|9|まえ|delante, antes
生|5|いきる|vida, nacer
五|4|いつ|cinco
間|12|あいだ|intervalo, entre
上|3|うえ|arriba
東|8|ひがし|este
四|5|よ|cuatro
今|4|いま|ahora
金|8|かね|oro, dinero
九|2|ここの|nueve
入|2|いる|entrar
学|8|まなぶ|estudiar
高|10|たかい|alto, caro
円|4|まるい|círculo, yen
子|3|こ|niño
外|5|そと|fuera
八|2|や|ocho
六|4|む|seis
下|3|した|abajo
来|7|くる|venir
気|6|いき|espíritu, ánimo
小|3|ちいさい|pequeño
七|2|なな|siete
山|3|やま|montaña
話|13|はなす|hablar
女|3|おんな|mujer
北|5|きた|norte
午|4|うま|mediodía
百|6|もも|cien
書|10|かく|escribir
先|6|さき|antes, punta
名|6|な|nombre
川|3|かわ|río
千|3|ち|mil
水|4|みず|agua
半|5|なかば|mitad
男|7|おとこ|hombre
西|6|にし|oeste
電|13|でん|electricidad
校|10|こう|escuela
語|14|かたる|idioma, palabra
土|3|つち|tierra
木|4|き|árbol
聞|14|きく|oír, preguntar
食|9|くう|comer
車|7|くるま|coche
何|7|なに|qué
南|9|みなみ|sur
万|3|よろず|diez mil
毎|6|ごと|cada
白|5|しろ|blanco
天|4|あまつ|cielo
母|5|はは|madre
火|4|ひ|fuego
右|5|みぎ|derecha
読|14|よむ|leer
友|4|とも|amigo
左|5|ひだり|izquierda
休|6|やすむ|descansar
父|4|ちち|padre
雨|8|あめ|lluvia
`;

const N4_TABLE = `
会|6|あう|Meeting
同|6|おなじ|Same
事|8|こと|Matter
自|6|みずから|Oneself
社|7|やしろ|Company
発|9|たつ|Departure
者|8|もの|Someone
地|6|ち|Ground
業|13|わざ|Business
方|4|かた|Direction
新|13|あたらしい|New
場|12|ば|Location
員|10|いん|Employee
立|5|たつ|Stand Up
開|12|ひらく|Open
手|4|て|Hand
力|2|ちから|Power
問|11|とう|Question
代|5|かわる|Substitute
明|8|あかり|Bright
動|11|うごく|Move
京|8|みやこ|Capital
目|5|め|Eye
通|10|とおる|Traffic
言|7|いう|Say
理|11|ことわり|Logic
体|7|からだ|Body
田|5|た|Rice Field
主|5|ぬし|Lord
題|18|だい|Topic
意|13|い|Idea
不|4|ふ|Negative
作|7|つくる|Make
用|5|もちいる|Utilize
度|9|たび|Degrees
強|11|つよい|Strong
公|4|おおやけ|Public
持|9|もつ|Hold
野|11|の|Plains
以|5|もって|By Means Of
思|9|おもう|Think
家|10|いえ|House
世|5|よ|Generation
多|6|おおい|Many
正|5|ただしい|Correct
安|6|やすい|Relax
院|10|いん|Inst.
心|4|こころ|Heart
界|9|かい|World
教|11|おしえる|Teach
文|4|ふみ|Sentence
元|4|もと|Beginning
重|9|え|Heavy
近|7|ちかい|Near
考|6|かんがえる|Consider
画|8|えがく|Brush-stroke
海|9|うみ|Sea
売|7|うる|Sell
知|8|しる|Know
道|12|みち|Road-way
集|12|あつまる|Gather
別|7|わかれる|Separate
物|8|もの|Thing
使|8|つかう|Use
品|9|しな|Goods
計|9|はかる|Plot
死|6|しぬ|Death
特|10|とく|Special
私|7|わたくし|Private
始|8|はじめる|Commence
朝|12|あさ|Morning
運|12|はこぶ|Carry
終|11|おわる|End
台|5|うてな|Pedestal
広|5|ひろい|Wide
住|7|すむ|Dwell
真|10|ま|True
有|6|ある|Possess
口|3|くち|Mouth
少|4|すくない|Few
町|7|まち|Town
料|10|りょう|Fee
工|3|こう|Craft
建|9|たてる|Build
空|8|そら|Empty
急|9|いそぐ|Hurry
止|4|とまる|Stop
送|9|おくる|Escort
切|4|きる|Cut
転|11|ころがる|Revolve
研|9|とぐ|Polish
足|7|あし|Leg
究|7|きわめる|Research
楽|13|たのしい|Music
起|10|おきる|Rouse
着|12|きる|Don
店|8|みせ|Store
病|10|やむ|Ill
質|15|たち|Substance
待|9|まつ|Wait
試|13|こころみる|Test
族|11|ぞく|Tribe
銀|14|しろがね|Silver
早|6|はやい|Early
映|9|うつる|Reflect
親|16|おや|Parent
験|18|あかし|Verification
英|8|はなぶさ|England
医|7|いやす|Doctor
仕|5|つかえる|Attend
去|5|さる|Gone
味|8|あじ|Flavor
写|5|うつす|Copy
字|6|あざ|Character
答|12|こたえる|Solution
夜|8|よ|Night
音|9|おと|Sound
注|8|そそぐ|Pour
帰|10|かえる|Homecoming
古|5|ふるい|Old
歌|14|うた|Song
買|12|かう|Buy
悪|11|わるい|Bad
図|7|え|Map
週|11|しゅう|Week
室|9|むろ|Room
歩|8|あるく|Walk
風|9|かぜ|Wind
紙|10|かみ|Paper
黒|11|くろ|Black
花|7|はな|Flower
春|9|はる|Springtime
赤|7|あか|Red
青|8|あお|Blue
館|16|やかた|Building
屋|9|や|Roof
色|6|いろ|Color
走|7|はしる|Run
秋|9|あき|Autumn
夏|10|なつ|Summer
習|11|ならう|Learn
駅|14|えき|Station
洋|9|よう|Ocean
旅|10|たび|Trip
服|8|ふく|Clothing
夕|3|ゆう|Evening
借|10|かりる|Borrow
曜|18|よう|Weekday
飲|12|のむ|Drink
肉|6|しし|Meat
貸|12|かす|Lend
堂|11|どう|Public Chamber
鳥|11|とり|Bird
飯|12|めし|Meal
勉|10|つとめる|Exertion
冬|5|ふゆ|Winter
昼|9|ひる|Daytime
茶|9|ちゃ|Tea
弟|7|おとうと|Younger Brother
牛|4|うし|Cow
魚|11|うお|Fish
兄|5|あに|Elder Brother
犬|4|いぬ|Dog
妹|8|いもうと|Younger Sister
姉|8|あね|Elder Sister
漢|13|かん|Sino-
`;

const N3_TABLE = `
政|9|まつりごと|Politics
議|20|ぎ|Deliberation
民|5|たみ|People
連|10|つらなる|Take Along
対|7|あいて|Vis-a-vis
部|11|べ|Section
合|6|あう|Fit
市|5|いち|Market
内|4|うち|Inside
相|9|あい|Inter-
定|8|さだめる|Determine
回|6|まわる|-times
選|15|えらぶ|Elect
米|6|こめ|Rice
実|8|み|Reality
関|14|せき|Connection
決|7|きめる|Decide
全|6|まったく|Whole
表|8|おもて|Surface
戦|13|いくさ|War
経|11|へる|Sutra
最|12|もっとも|Utmost
現|11|あらわれる|Present
調|15|しらべる|Tune
化|4|ばける|Change
当|6|あたる|Hit
約|9|つづまる|Promise
首|9|くび|Neck
法|8|のり|Method
性|8|さが|Sex
要|9|いる|Need
制|8|せい|System
治|8|おさめる|Reign
務|11|つとめる|Task
成|6|なる|Turn Into
期|12|き|Period
取|8|とる|Take
都|11|みやこ|Metropolis
和|8|やわらぐ|Harmony
機|16|はた|Loom
平|5|たいら|Even
加|5|くわえる|Add
受|8|うける|Accept
続|13|つづく|Continue
進|11|すすむ|Advance
数|13|かず|Number
記|10|しるす|Scribe
初|7|はじめ|First Time
指|9|ゆび|Finger
権|15|おもり|Authority
支|4|ささえる|Branch
産|11|うむ|Products
点|9|つける|Spot
報|12|むくいる|Report
済|11|すむ|Settle (debt, Etc.)
活|9|いきる|Lively
原|10|はら|Meadow
共|6|とも|Together
得|11|える|Gain
解|13|とく|Unravel
交|6|まじわる|Mingle
資|13|し|Assets
予|4|あらかじめ|Beforehand
向|6|むく|Yonder
際|14|きわ|Occasion
勝|12|かつ|Victory
面|9|おも|Mask
告|7|つげる|Revelation
反|4|そる|Anti-
判|7|わかる|Judgement
認|14|みとめる|Acknowledge
参|8|まいる|Nonplussed
利|7|きく|Profit
組|11|くむ|Association
信|9|しん|Faith
在|6|ある|Exist
件|6|くだん|Affair
側|11|かわ|Side
任|6|まかせる|Responsibility
引|4|ひく|Pull
求|7|もとめる|Request
所|8|ところ|Place
次|6|つぐ|Next
昨|9|さく|Yesterday
論|15|ろん|Argument
官|8|かん|Bureaucrat
増|14|ます|Increase
係|9|かかる|Person In Charge
感|13|かん|Emotion
情|11|なさけ|Feelings
投|7|なげる|Throw
示|5|しめす|Show
変|9|かわる|Unusual
打|5|うつ|Strike
直|8|ただちに|Straightaway
両|6|てる|Both
式|6|しき|Style
確|15|たしか|Assurance
果|8|はたす|Fruit
容|10|いれる|Contain
必|5|かならず|Invariably
演|14|えん|Performance
歳|13|とし|Year-end
争|6|あらそう|Contend
談|15|だん|Discuss
能|10|よく|Ability
位|7|くらい|Rank
置|13|おく|Placement
流|10|ながれる|Current
格|10|かく|Status
疑|14|うたがう|Doubt
過|12|すぎる|Overdo
局|7|つぼね|Bureau
放|8|はなす|Set Free
常|11|つね|Usual
状|7|じょう|Status Quo
球|11|たま|Ball
職|18|しょく|Post
与|3|あたえる|Bestow
供|8|そなえる|Submit
役|7|やく|Duty
構|14|かまえる|Posture
割|12|わる|Proportion
費|12|ついやす|Expense
付|5|つける|Adhere
由|5|よし|Wherefore
説|14|とく|Opinion
難|18|かたい|Difficult
優|17|やさしい|Tenderness
夫|4|おっと|Husband
収|4|おさめる|Income
断|11|たつ|Severance
石|5|いし|Stone
違|13|ちがう|Difference
消|10|きえる|Extinguish
神|9|かみ|Gods
番|12|つがい|Turn
規|11|き|Standard
術|11|すべ|Art
備|12|そなえる|Equip
宅|6|たく|Home
害|10|がい|Harm
配|10|くばる|Distribute
警|19|いましめる|Admonish
育|8|そだつ|Bring Up
席|10|むしろ|Seat
訪|11|おとずれる|Call On
乗|9|のる|Ride
残|10|のこる|Remainder
想|13|おもう|Concept
声|7|こえ|Voice
念|8|ねん|Wish
助|7|たすける|Help
労|7|ろうする|Labor
例|8|たとえる|Example
然|12|しか|Sort Of Thing
限|9|かぎる|Limit
追|9|おう|Chase
商|11|あきなう|Make A Deal
葉|12|は|Leaf
伝|6|つたわる|Transmit
働|13|はたらく|Work
形|7|かた|Shape
景|12|けい|Scenery
落|12|おちる|Fall
好|6|このむ|Fond
退|9|しりぞく|Retreat
頭|16|あたま|Head
負|9|まける|Defeat
渡|12|わたる|Transit
失|5|うしなう|Lose
差|10|さす|Distinction
末|5|すえ|End
守|6|まもる|Guard
若|8|わかい|Young
種|14|たね|Species
美|9|うつくしい|Beauty
命|8|いのち|Fate
福|13|ふく|Blessing
望|11|のぞむ|Ambition
非|8|あらず|Un-
観|18|みる|Outlook
察|14|さつ|Guess
段|9|だん|Grade
横|15|よこ|Sideways
深|11|ふかい|Deep
申|5|もうす|Have The Honor To
様|14|さま|Esq.
財|10|たから|Property
港|12|みなと|Harbor
識|19|しる|Discriminating
呼|8|よぶ|Call
達|12|たち|Accomplished
良|7|よい|Good
候|10|そうろう|Climate
程|12|ほど|Extent
満|12|みちる|Full
敗|11|やぶれる|Failure
値|10|ね|Price
突|8|つく|Stab
光|6|ひかる|Ray
路|13|じ|Path
科|9|か|Department
積|16|つむ|Volume
他|5|ほか|Other
処|5|ところ|Dispose
太|4|ふとい|Plump
客|9|きゃく|Guest
否|7|いな|Negate
師|10|いくさ|Expert
登|12|のぼる|Ascend
易|8|やさしい|Easy
速|10|はやい|Quick
存|6|ながらえる|Exist
飛|9|とぶ|Fly
殺|10|ころす|Kill
号|5|さけぶ|Nickname
単|9|ひとえ|Simple
座|10|すわる|Squat
破|10|やぶる|Rend
除|10|のぞく|Exclude
完|7|かん|Perfect
降|10|おりる|Descend
責|11|せめる|Blame
捕|10|とらえる|Catch
危|6|あぶない|Dangerous
給|12|たまう|Salary
苦|8|くるしい|Suffering
迎|7|むかえる|Welcome
園|13|その|Park
具|8|そなえる|Tool
辞|13|やめる|Resign
因|6|よる|Cause
馬|10|うま|Horse
愛|13|いとしい|Love
富|12|とむ|Wealth
彼|8|かれ|He
未|5|いまだ|Un-
舞|15|まう|Dance
亡|3|ない|Deceased
冷|7|つめたい|Cool
適|14|かなう|Suitable
婦|11|よめ|Lady
寄|11|よる|Draw Near
込|5|こむ|Crowded
顔|18|かお|Face
類|18|たぐい|Sort
余|7|あまる|Too Much
王|4|おう|King
返|7|かえす|Return
妻|8|つま|Wife
背|9|せ|Stature
熱|15|あつい|Heat
宿|11|やど|Inn
薬|16|くすり|Medicine
険|11|けわしい|Precipitous
頼|16|たのむ|Trust
覚|12|おぼえる|Memorize
船|11|ふね|Ship
途|10|みち|Route
許|11|ゆるす|Permit
抜|7|ぬく|Slip Out
便|9|たより|Convenience
留|10|とめる|Detain
罪|13|つみ|Guilt
努|7|つとめる|Toil
精|14|しらげる|Refined
散|12|ちる|Scatter
静|14|しず|Quiet
婚|11|こん|Marriage
喜|12|よろこぶ|Rejoice
浮|10|うく|Floating
絶|12|たえる|Discontinue
幸|8|さいわい|Happiness
押|8|おす|Push
倒|10|たおれる|Overthrow
等|12|ひとしい|Etc.
老|6|おいる|Old Man
曲|6|まがる|Bend
払|5|はらう|Pay
庭|10|にわ|Courtyard
徒|10|いたずら|On Foot
勤|12|つとめる|Diligence
遅|12|おくれる|Slow
居|8|いる|Reside
雑|14|まじえる|Miscellaneous
招|8|まねく|Beckon
困|7|こまる|Quandary
欠|4|かける|Lack
更|7|さら|Grow Late
刻|8|きざむ|Engrave
賛|15|たすける|Approve
抱|8|だく|Embrace
犯|5|おかす|Crime
恐|10|おそれる|Fear
息|10|いき|Breath
遠|13|とおい|Distant
戻|7|もどす|Re-
願|19|ねがう|Petition
絵|12|かい|Picture
越|12|こす|Surpass
欲|11|ほっする|Longing
痛|12|いたい|Pain
笑|10|わらう|Laugh
互|4|たがい|Mutually
束|7|たば|Bundle
似|7|にる|Becoming
列|6|れつ|File
探|11|さぐる|Grope
逃|9|にげる|Escape
遊|12|あそぶ|Play
迷|9|まよう|Astray
夢|13|ゆめ|Dream
君|7|きみ|Mister
閉|11|とじる|Closed
緒|14|お|Thong
折|7|おる|Fold
草|9|くさ|Grass
暮|14|くれる|Evening
酒|10|さけ|Sake
悲|12|かなしい|Grieve
晴|12|はれる|Clear Up
掛|11|かける|Hang
到|8|いたる|Arrival
寝|13|ねる|Lie Down
暗|13|くらい|Darkness
盗|11|ぬすむ|Steal
吸|6|すう|Suck
陽|12|ひ|Sunshine
御|12|おん|Honorable
歯|12|よわい|Tooth
忘|7|わすれる|Forget
雪|11|ゆき|Snow
吹|7|ふく|Blow
娘|10|むすめ|Daughter
誤|14|あやまる|Mistake
洗|9|あらう|Wash
慣|14|なれる|Accustomed
礼|5|れい|Salute
窓|11|まど|Window
昔|8|むかし|Once Upon A Time
貧|11|まずしい|Poverty
怒|9|いかる|Angry
泳|8|およぐ|Swim
祖|9|そ|Ancestor
杯|8|さかずき|Counter For Cupfuls
疲|10|つかれる|Exhausted
皆|9|みな|All
鳴|14|なく|Chirp
腹|13|はら|Abdomen
煙|13|けむる|Smoke
眠|10|ねむる|Sleep
怖|8|こわい|Dreadful
耳|6|みみ|Ear
頂|11|いただく|Place On The Head
箱|15|はこ|Box
晩|12|ばん|Nightfall
寒|12|さむい|Cold
髪|14|かみ|Hair Of The Head
忙|6|いそがしい|Busy
才|3|さい|Genius
靴|13|くつ|Shoes
恥|10|はじる|Shame
偶|11|たま|Accidentally
偉|12|えらい|Admirable
猫|11|ねこ|Cat
幾|12|いく|How Many
`;

const N2_TABLE = `
党|10|なかま|Party
協|8|きょう|Co-
総|14|すべて|General
区|4|く|Ward
領|14|えり|Jurisdiction
県|9|かける|Prefecture
設|11|もうける|Establishment
改|7|あらためる|Reformation
府|8|ふ|Borough
査|9|さ|Investigate
委|8|ゆだねる|Committee
軍|9|いくさ|Army
団|6|かたまり|Group
各|6|おのおの|Each
島|10|しま|Island
革|9|かわ|Leather
村|7|むら|Village
勢|13|いきおい|Forces
減|12|へる|Dwindle
再|6|ふたたび|Again
税|12|ぜい|Tax
営|12|いとなむ|Occupation
比|4|くらべる|Compare
防|7|ふせぐ|Ward Off
補|12|おぎなう|Supplement
境|14|さかい|Boundary
導|15|みちびく|Guidance
副|11|ふく|Vice-
算|14|そろ|Calculate
輸|16|ゆ|Transport
述|8|のべる|Mention
線|15|すじ|Line
農|13|のう|Agriculture
州|6|す|State
武|8|たけ|Warrior
象|12|かたどる|Elephant
域|11|いき|Range
額|18|ひたい|Forehead
欧|8|うたう|Europe
担|8|かつぐ|Shouldering
準|13|じゅんじる|Semi-
賞|15|ほめる|Prize
辺|5|あたり|Environs
造|10|つくる|Create
被|10|こうむる|Incur
技|7|わざ|Skill
低|7|ひくい|Lower
復|12|また|Restore
移|11|うつる|Shift
個|10|こ|Individual
門|8|かど|Gate
課|15|か|Chapter
脳|11|のうずる|Brain
極|12|きわめる|Poles
含|7|ふくむ|Contain
蔵|15|くら|Storehouse
量|12|はかる|Quantity
型|9|かた|Mould
況|8|まして|Condition
針|10|はり|Needle
専|9|もっぱら|Specialty
谷|7|たに|Valley
史|5|し|History
階|12|きざはし|Storey
管|14|くだ|Pipe
兵|7|つわもの|Soldier
接|11|つぐ|Touch
細|11|ほそい|Dainty
効|8|きく|Merit
丸|3|まる|Round
湾|12|いりえ|Gulf
録|16|しるす|Record
省|9|かえりみる|Focus
旧|5|ふるい|Old Times
橋|16|はし|Bridge
岸|8|きし|Beach
周|8|まわり|Circumference
材|7|ざい|Lumber
戸|4|と|Door
央|5|おう|Center
券|8|けん|Ticket
編|15|あむ|Compilation
捜|10|さがす|Search
竹|6|たけ|Bamboo
超|12|こえる|Transcend
並|8|なみ|Row
療|17|りょう|Heal
採|11|とる|Pick
森|12|もり|Forest
競|20|きそう|Emulate
介|4|かい|Jammed In
根|10|ね|Root
販|11|はん|Marketing
歴|14|れき|Curriculum
将|10|まさに|Leader
幅|12|はば|Hanging Scroll
般|10|はん|Carrier
貿|12|ぼう|Trade
講|17|こう|Lecture
林|8|はやし|Grove
装|12|よそおう|Attire
諸|15|もろ|Various
劇|15|げき|Drama
河|8|かわ|River
航|10|こう|Navigate
鉄|13|くろがね|Iron
児|7|こ|Newborn Babe
禁|13|きん|Prohibition
印|6|しるし|Stamp
逆|9|さか|Inverted
換|12|かえる|Interchange
久|3|ひさしい|Long Time
短|12|みじかい|Short
油|8|あぶら|Oil
暴|15|あばく|Outburst
輪|15|わ|Wheel
占|5|しめる|Fortune-telling
植|12|うえる|Plant
清|11|きよい|Pure
倍|10|ばい|Double
均|7|ならす|Level
億|15|おく|Hundred Million
圧|5|おす|Pressure
芸|7|うえる|Technique
署|13|しょ|Signature
伸|7|のびる|Expand
停|11|とめる|Halt
爆|19|はぜる|Bomb
陸|11|おか|Land
玉|5|たま|Jewel
波|8|なみ|Waves
帯|10|おびる|Sash
延|8|のびる|Prolong
羽|6|は|Feathers
固|8|かためる|Harden
則|9|のっとる|Rule
乱|7|みだれる|Riot
普|12|あまねく|Universal
測|12|はかる|Fathom
豊|13|ゆたか|Bountiful
厚|9|あつい|Thick
齢|17|よわい|Age
囲|7|かこむ|Surround
卒|8|そっする|Graduate
略|11|ほぼ|Abbreviation
承|8|うけたまわる|Acquiesce
順|12|じゅん|Obey
岩|8|いわ|Boulder
練|14|ねる|Practice
軽|12|かるい|Lightly
了|2|りょう|Complete
庁|5|やくしょ|Government Office
城|9|しろ|Castle
患|11|わずらう|Afflicted
層|14|そう|Stratum
版|8|はん|Printing Block
令|5|れい|Orders
角|7|かど|Angle
絡|12|からむ|Entwine
損|13|そこなう|Damage
募|12|つのる|Recruit
裏|13|うら|Back
仏|4|ほとけ|Buddha
績|17|せき|Exploits
築|16|きずく|Fabricate
貨|11|たから|Freight
混|11|まじる|Mix
昇|8|のぼる|Rise Up
池|6|いけ|Pond
血|6|ち|Blood
温|12|あたたか|Warm
季|8|き|Seasons
星|9|ほし|Star
永|5|ながい|Eternity
著|11|あらわす|Renowned
誌|14|し|Document
庫|10|くら|Warehouse
刊|5|かん|Publish
像|14|ぞう|Statue
香|9|か|Incense
坂|7|さか|Slope
底|8|そこ|Bottom
布|5|ぬの|Linen
寺|6|てら|Buddhist Temple
宇|6|う|Eaves
巨|5|きょ|Gigantic
震|15|ふるう|Quake
希|7|まれ|Hope
触|13|ふれる|Contact
依|8|よる|Reliant
籍|20|せき|Enroll
汚|6|けがす|Dirty
枚|8|まい|Sheet Of...
複|14|ふく|Duplicate
郵|11|ゆう|Mail
仲|6|なか|Go-between
栄|9|さかえる|Flourish
札|5|ふだ|Tag
板|8|いた|Plank
骨|10|ほね|Skeleton
傾|13|かたむく|Lean
届|8|とどける|Deliver
巻|9|まく|Scroll
燃|16|もえる|Burn
跡|13|あと|Tracks
包|5|つつむ|Wrap
駐|15|ちゅう|Stop-over
弱|10|よわい|Weak
紹|11|しょう|Introduce
雇|12|やとう|Employ
替|12|かえる|Exchange
預|13|あずける|Deposit
焼|12|やく|Bake
簡|18|えらぶ|Simplicity
章|11|しょう|Badge
臓|19|はらわた|Entrails
律|9|りつ|Rhythm
贈|18|おくる|Presents
照|13|てる|Illuminate
薄|16|うすい|Dilute
群|13|むれる|Flock
秒|9|びょう|Second (1/60 Minute)
奥|12|おく|Heart
詰|13|つめる|Packed
双|4|ふた|Pair
刺|8|さす|Thorn
純|10|じゅん|Genuine
翌|11|よく|The Following
快|7|こころよい|Cheerful
片|4|かた|One-sided
敬|12|うやまう|Awe
悩|10|なやむ|Trouble
泉|9|いずみ|Spring
皮|5|かわ|Pelt
漁|14|あさる|Fishing
荒|9|あらい|Laid Waste
貯|12|ためる|Savings
硬|12|かたい|Stiff
埋|10|うめる|Bury
柱|9|はしら|Pillar
祭|11|まつる|Ritual
袋|11|ふくろ|Sack
筆|12|ふで|Writing Brush
訓|10|おしえる|Instruction
浴|10|あびる|Bathe
童|12|わらべ|Juvenile
宝|8|たから|Treasure
封|9|ふう|Seal
胸|10|むね|Bosom
砂|9|すな|Sand
塩|13|しお|Salt
賢|16|かしこい|Intelligent
腕|12|うで|Arm
兆|6|きざす|Portent
床|7|とこ|Bed
毛|4|け|Fur
緑|14|みどり|Green
尊|12|たっとい|Revered
祝|9|いわう|Celebrate
柔|9|やわらか|Tender
殿|13|との|Mr.
濃|16|こい|Concentrated
液|11|えき|Fluid
衣|6|ころも|Garment
肩|8|かた|Shoulder
零|13|ぜろ|Zero
幼|5|おさない|Infancy
荷|10|に|Baggage
泊|8|とまる|Overnight Stay
黄|11|き|Yellow
甘|5|あまい|Sweet
臣|7|しん|Retainer
浅|9|あさい|Shallow
掃|11|はく|Sweep
雲|12|くも|Cloud
掘|11|ほる|Dig
捨|11|すてる|Discard
軟|11|やわらか|Soft
沈|7|しずむ|Sink
凍|10|こおる|Frozen
乳|8|ちち|Milk
恋|10|こう|Romance
紅|9|べに|Crimson
郊|9|こう|Outskirts
腰|13|こし|Loins
炭|9|すみ|Charcoal
踊|14|おどる|Jump
冊|5|ふみ|Tome
勇|9|いさむ|Courage
械|11|かせ|Contraption
菜|11|な|Vegetable
珍|9|めずらしい|Rare
卵|7|たまご|Egg
湖|12|みずうみ|Lake
喫|12|のむ|Consume
干|3|ほす|Dry
虫|6|むし|Insect
刷|8|する|Printing
湯|12|ゆ|Hot Water
溶|13|とける|Melt
鉱|13|あらがね|Mineral
涙|10|なみだ|Tears
匹|4|ひき|Equal
孫|10|まご|Grandchild
鋭|15|するどい|Pointed
枝|8|えだ|Bough
塗|13|ぬる|Paint
軒|10|のき|Flats
毒|8|どく|Poison
叫|6|さけぶ|Shout
拝|8|おがむ|Worship
氷|5|こおり|Icicle
乾|11|かわく|Drought
棒|12|ぼう|Rod
祈|8|いのる|Pray
拾|9|ひろう|Pick Up
粉|10|デシメートル|Flour
糸|6|いと|Thread
綿|14|わた|Cotton
汗|6|あせ|Sweat
銅|14|あかがね|Copper
湿|12|しめる|Damp
瓶|11|かめ|Bottle
咲|9|さく|Blossom
召|5|めす|Seduce
缶|6|かま|Tin Can
隻|10|せき|Vessels
脂|10|あぶら|Fat
蒸|13|むす|Steam
肌|6|はだ|Texture
耕|10|たがやす|Till
鈍|12|にぶい|Dull
泥|8|どろ|Mud
隅|12|すみ|Corner
灯|6|ひ|Lamp
辛|7|からい|Spicy
磨|16|みがく|Grind
麦|7|むぎ|Barley
姓|8|せい|Surname
筒|12|つつ|Cylinder
鼻|14|はな|Nose
粒|11|つぶ|Grains
詞|12|ことば|Part Of Speech
胃|9|い|Stomach
畳|12|たたむ|Tatami Mat
机|6|つくえ|Desk
膚|15|はだ|Skin
濯|17|すすぐ|Laundry
塔|12|とう|Pagoda
沸|8|わく|Seethe
灰|6|はい|Ashes
菓|11|か|Candy
帽|12|ずきん|Cap
枯|9|かれる|Wither
涼|11|すずしい|Refreshing
舟|6|ふね|Boat
貝|7|かい|Shellfish
符|11|ふ|Token
憎|14|にくむ|Hate
皿|5|さら|Dish
肯|8|がえんじる|Agreement
燥|17|はしゃぐ|Parch
畜|10|ちく|Livestock
挟|9|はさむ|Pinch
曇|16|くもる|Cloudy Weather
滴|14|しずく|Drip
伺|7|うかがう|Pay Respects
`;

const N1_TABLE = `
氏|4|うじ|Family Name
統|12|すべる|Overall
保|9|たもつ|Protect
第|11|だい|No.
結|12|むすぶ|Tie
派|9|は|Faction
案|10|つくえ|Plan
策|12|さく|Scheme
基|11|もと|Fundamentals
価|8|あたい|Value
提|12|さげる|Propose
挙|10|あげる|Raise
応|7|あたる|Apply
企|6|くわだてる|Undertake
検|12|しらべる|Examination
藤|18|ふじ|Wisteria
沢|7|さわ|Swamp
裁|12|たつ|Tailor
証|12|あかし|Evidence
援|12|えん|Abet
施|9|ほどこす|Give
井|4|い|Well
護|20|まもる|Safeguard
展|10|てん|Unfold
態|14|わざと|Attitude
鮮|17|あざやか|Fresh
視|11|みる|Inspection
条|7|えだ|Article
幹|13|みき|Tree Trunk
独|9|ひとり|Single
宮|10|みや|Shinto Shrine
率|11|ひきいる|Ratio
衛|16|えい|Defense
張|11|はる|Lengthen
監|15|かん|Oversee
環|17|わ|Ring
審|15|つまびらか|Hearing
義|13|ぎ|Righteousness
訴|12|うったえる|Accusation
株|10|かぶ|Stocks
姿|9|すがた|Figure
閣|14|かく|Tower
衆|12|おおい|Masses
評|12|ひょう|Evaluate
影|15|かげ|Shadow
松|8|まつ|Pine Tree
撃|15|うつ|Beat
佐|7|さ|Assistant
核|10|かく|Nucleus
整|16|ととのえる|Organize
融|16|とける|Dissolve
製|14|せい|Made In...
票|11|ひょう|Ballot
渉|11|わたる|Ford
響|20|ひびく|Echo
推|11|おす|Conjecture
請|15|こう|Solicit
器|15|うつわ|Utensil
士|3|さむらい|Gentleman
討|10|うつ|Chastise
攻|7|せめる|Aggression
崎|11|さき|Promontory
督|13|とく|Coach
授|11|さずける|Impart
催|13|もようす|Sponsor
及|3|およぶ|Reach Out
憲|16|けん|Constitution
離|19|はなれる|Detach
激|16|はげしい|Violent
摘|14|つむ|Pinch
系|7|けい|Lineage
批|7|ひ|Criticism
郎|9|おとこ|Son
健|11|すこやか|Healthy
盟|13|めい|Alliance
従|10|したがう|Accompany
修|10|おさめる|Discipline
隊|12|たい|Regiment
織|18|おる|Weave
拡|8|ひろがる|Broaden
故|9|ゆえ|Happenstance
振|10|ふる|Shake
弁|5|かんむり|Valve
就|12|つく|Concerning
異|11|こと|Uncommon
献|13|たてまつる|Offering
厳|17|おごそか|Stern
維|14|い|Fiber
浜|10|はま|Seacoast
遺|15|のこす|Bequeath
塁|12|とりで|Bases
邦|7|くに|Home Country
素|10|もと|Elementary
遣|13|つかう|Dispatch
抗|7|あらがう|Confront
模|14|も|Imitation
雄|12|お|Masculine
益|10|ます|Benefit
緊|15|しめる|Tense
標|15|しるべ|Signpost
宣|9|のたまう|Proclaim
昭|9|しょう|Shining
廃|12|すたれる|Abolish
伊|6|かれ|Italy
江|6|え|Creek
僚|14|りょう|Colleague
吉|6|よし|Good Luck
盛|11|もる|Boom
皇|9|こう|Emperor
臨|18|のぞむ|Look To
踏|15|ふむ|Step
壊|16|こわす|Demolition
債|13|さい|Bond
興|16|おこる|Entertain
源|13|みなもと|Source
儀|15|ぎ|Ceremony
創|12|つくる|Genesis
障|14|さわる|Hinder
継|13|つぐ|Inherit
筋|12|すじ|Muscle
闘|18|たたかう|Fight
葬|12|ほうむる|Interment
避|16|さける|Evade
司|5|つかさどる|Director
康|11|こう|Ease
善|12|よい|Virtuous
逮|11|たい|Apprehend
迫|8|せまる|Urge
惑|12|まどう|Beguile
崩|11|くずれる|Crumble
紀|9|き|Chronicle
聴|17|きく|Listen
脱|11|ぬぐ|Undress
級|9|きゅう|Class
博|12|はく|Dr.
締|15|しまる|Tighten
救|11|すくう|Salvation
執|11|とる|Tenacious
房|8|ふさ|Tassel
撤|15|てつ|Remove
削|9|けずる|Plane
密|11|ひそか|Secrecy
措|11|おく|Set Aside
志|7|シリング|Intention
載|13|のせる|Ride
陣|10|じん|Camp
我|7|われ|Ego
為|9|ため|Do
抑|7|おさえる|Repress
幕|13|とばり|Curtain
染|9|そめる|Dye
奈|8|いかん|Nara
傷|13|きず|Wound
択|7|えらぶ|Choose
秀|7|ひいでる|Excel
徴|14|しるし|Indications
弾|12|ひく|Bullet
償|17|つぐなう|Reparation
功|5|いさお|Achievement
拠|8|よる|Foothold
秘|10|ひめる|Secret
拒|8|こばむ|Repel
刑|6|けい|Punish
塚|12|つか|Hillock
致|10|いたす|Doth
繰|19|くる|Winding
尾|7|お|Tail
描|11|えがく|Sketch
鈴|13|すず|Small Bell
盤|15|ばん|Tray
項|12|うなじ|Paragraph
喪|12|も|Miss
伴|7|ともなう|Consort
養|15|やしなう|Foster
懸|20|かける|State Of Suspension
街|12|まち|Boulevard
契|9|ちぎる|Pledge
掲|11|かかげる|Put Up (a Notice)
躍|21|おどる|Leap
棄|13|すてる|Abandon
邸|8|やしき|Residence
縮|17|ちぢむ|Shrink
還|16|かえる|Send Back
属|12|さかん|Belong
慮|15|おもんぱくる|Prudence
枠|8|わく|Frame
恵|10|めぐむ|Favor
露|21|つゆ|Dew
沖|7|おき|Open Sea
緩|15|ゆるい|Slacken
節|13|ふし|Node
需|14|じゅ|Demand
射|10|いる|Shoot
購|17|こう|Subscription
揮|12|ふるう|Brandish
充|6|あてる|Allot
貢|10|みつぐ|Tribute
鹿|11|しか|Deer
却|7|かえって|Instead
端|14|はし|Edge
賃|13|ちん|Fare
獲|16|える|Seize
郡|10|こおり|County
併|8|あわせる|Join
徹|15|てつ|Penetrate
貴|12|たっとい|Precious
衝|15|つく|Collide
焦|12|こげる|Char
奪|14|うばう|Rob
災|7|わざわい|Disaster
浦|10|うら|Bay
析|8|せき|Chop
譲|20|ゆずる|Defer
称|10|たたえる|Appellation
納|10|おさめる|Settlement
樹|16|き|Timber
挑|9|いどむ|Challenge
誘|14|さそう|Entice
紛|10|まぎれる|Distract
至|6|いたる|Climax
宗|8|むね|Religion
促|9|うながす|Stimulate
慎|13|つつしむ|Humility
控|11|ひかえる|Withdraw
智|12|ち|Wisdom
握|12|にぎる|Grip
宙|8|ちゅう|Mid-air
俊|9|しゅん|Sagacious
銭|14|ぜに|Coin
渋|11|しぶ|Astringent
銃|14|つつ|Gun
操|16|みさお|Maneuver
携|13|たずさえる|Portable
診|12|みる|Checkup
託|10|かこつける|Consign
撮|15|とる|Snapshot
誕|15|たん|Nativity
侵|9|おかす|Encroach
括|9|くくる|Fasten
謝|17|あやまる|Apologize
駆|14|かける|Drive
透|10|すく|Transparent
津|9|つ|Haven
壁|16|かべ|Wall
稲|14|いね|Rice Plant
仮|6|かり|Sham
裂|12|さく|Split
敏|10|さとい|Cleverness
是|9|これ|Just So
排|11|はい|Repudiate
裕|12|ゆう|Abundant
堅|12|かたい|Strict
訳|11|わけ|Translate
芝|6|しば|Turf
綱|14|つな|Hawser
典|8|てん|Code
賀|12|が|Congratulations
扱|6|あつかい|Handle
顧|21|かえりみる|Look Back
弘|5|ひろい|Vast
看|9|みる|Watch Over
訟|11|しょう|Sue
戒|7|いましめる|Commandment
祉|8|し|Welfare
誉|13|ほまれ|Reputation
歓|15|よろこぶ|Delight
奏|9|かなでる|Play Music
勧|13|すすめる|Persuade
騒|18|さわぐ|Boisterous
閥|14|ばつ|Clique
甲|5|きのえ|Armor
縄|15|なわ|Straw Rope
郷|11|さと|Home Town
揺|12|ゆれる|Swing
免|8|まぬかれる|Excuse
既|10|すでに|Previously
薦|16|すすめる|Recommend
隣|16|となる|Neighboring
華|10|はな|Splendor
範|15|はん|Pattern
隠|14|かくす|Conceal
徳|14|とく|Benevolence
哲|10|さとい|Philosophy
杉|7|すぎ|Cedar
釈|11|とく|Explanation
己|3|おのれ|Self
妥|7|だ|Gentle
威|9|おどす|Intimidate
豪|14|えらい|Overpowering
熊|14|くま|Bear
滞|13|とどこおる|Stagnate
微|13|かすか|Delicate
隆|11|りゅう|Hump
症|10|しょう|Symptoms
暫|15|しばらく|Temporarily
忠|8|ちゅう|Loyalty
倉|10|くら|Godown
彦|9|ひこ|Lad
肝|7|きも|Liver
喚|12|わめく|Yell
沿|8|そう|Run Alongside
妙|7|たえ|Exquisite
唱|11|となえる|Chant
阿|8|おもねる|Africa
索|10|さく|Cord
誠|13|まこと|Sincerity
襲|22|おそう|Attack
懇|17|ねんごろ|Sociable
俳|10|はい|Haiku
柄|9|がら|Design
驚|22|おどろく|Wonder
麻|11|あさ|Hemp
李|7|すもも|Plum
浩|10|おおきい|Wide Expanse
剤|10|かる|Dose
瀬|19|せ|Rapids
趣|15|おもむき|Purport
陥|10|おちいる|Collapse
斎|11|とき|Purification
貫|11|つらぬく|Pierce
仙|5|せん|Hermit
慰|15|なぐさめる|Consolation
序|7|ついで|Preface
旬|6|じゅん|Decameron
兼|10|かねる|Concurrently
聖|13|ひじり|Holy
旨|6|むね|Delicious
即|7|つく|Instant
柳|9|やなぎ|Willow
舎|8|やどる|Cottage
偽|11|いつわる|Falsehood
較|13|くらべる|Contrast
覇|19|はたがしら|Hegemony
詳|13|くわしい|Detailed
抵|8|てい|Resist
脅|10|おびやかす|Threaten
茂|8|しげる|Overgrown
犠|17|いけにえ|Sacrifice
旗|14|はた|National Flag
距|12|へだたる|Long-distance
雅|13|みやび|Gracious
飾|13|かざる|Decorate
網|14|あみ|Netting
竜|10|たつ|Dragon
詩|13|うた|Poem
繁|16|しげる|Luxuriant
翼|17|つばさ|Wing
潟|15|かた|Lagoon
敵|15|かたき|Enemy
魅|15|み|Fascination
嫌|13|きらう|Dislike
斉|8|そろう|Adjusted
敷|15|しく|Spread
擁|16|よう|Hug
圏|12|かこい|Sphere
酸|14|すい|Acid
罰|14|ばっする|Penalty
滅|13|ほろびる|Destroy
礎|18|いしずえ|Cornerstone
腐|14|くさる|Rot
脚|11|あし|Skids
潮|15|しお|Tide
梅|10|うめ|Plum
尽|6|つくす|Exhaust
僕|14|しもべ|Me
桜|10|さくら|Cherry
滑|13|すべる|Slippery
孤|9|こ|Orphan
炎|8|ほのお|Inflammation
賠|15|ばい|Compensation
句|5|く|Phrase
鋼|16|はがね|Steel
頑|13|かたく|Stubborn
鎖|18|くさり|Chain
彩|11|いろどる|Coloring
摩|15|まする|Chafe
励|7|はげむ|Encourage
縦|16|たて|Vertical
輝|15|かがやく|Radiance
蓄|13|たくわえる|Amass
軸|12|じく|Axis
巡|6|めぐる|Patrol
稼|15|かせぐ|Earnings
瞬|18|またたく|Wink
砲|10|ほう|Cannon
噴|15|ふく|Erupt
誇|13|ほこる|Boast
祥|10|さいわい|Auspicious
牲|9|せい|Animal Sacrifice
秩|10|ちつ|Regularity
帝|9|みかど|Sovereign
宏|7|ひろい|Wide
唆|10|そそる|Tempt
阻|8|はばむ|Thwart
泰|10|たい|Peaceful
賄|13|まかなう|Bribe
撲|15|ぼく|Slap
堀|11|ほり|Ditch
菊|11|きく|Chrysanthemum
絞|12|しぼる|Strangle
縁|15|ふち|Affinity
唯|11|ただ|Solely
膨|16|ふくらむ|Swell
矢|5|や|Dart
耐|9|たえる|-proof
塾|14|じゅく|Cram School
漏|14|もる|Leak
慶|15|よろこび|Jubilation
猛|11|もう|Fierce
芳|7|かんばしい|Perfume
懲|18|こりる|Penal
剣|10|つるぎ|Sabre
彰|14|しょう|Patent
棋|12|ご|Chess Piece
丁|2|ひのと|Street
恒|9|つね|Constancy
揚|12|あげる|Raise
冒|9|おかす|Risk
之|3|の|Of
倫|10|りん|Ethics
陳|11|ひねる|Exhibit
憶|16|おく|Recollection
潜|15|ひそむ|Submerge
梨|11|なし|Pear Tree
仁|4|じん|Humanity
克|7|かつ|Overcome
岳|8|たけ|Point
概|14|おおむね|Outline
拘|8|かかわる|Arrest
墓|13|はか|Grave
黙|15|だまる|Silence
須|12|すべからく|Ought
偏|11|かたよる|Partial
雰|12|ふん|Atmosphere
遇|12|あう|Meet
諮|16|はかる|Consult With
狭|9|せまい|Cramped
卓|8|たく|Eminent
亀|11|かめ|Tortoise
糧|18|かて|Provisions
簿|19|ぼ|Register
炉|8|いろり|Hearth
牧|8|まき|Breed
殊|10|こと|Particularly
殖|12|ふえる|Augment
艦|21|かん|Warship
輩|15|ばら|Comrade
穴|5|あな|Hole
奇|8|くしき|Strange
慢|14|まん|Ridicule
鶴|21|つる|Crane
謀|16|はかる|Conspire
暖|13|あたたか|Warmth
昌|8|さかん|Prosperous
拍|8|はく|Clap
朗|10|ほがらか|Melodious
寛|13|くつろぐ|Tolerant
覆|18|おおう|Capsize
胞|9|ほう|Placenta
泣|8|なく|Cry
隔|13|へだてる|Isolate
浄|9|きよめる|Clean
没|7|おぼれる|Drown
暇|13|ひま|Spare Time
肺|9|はい|Lungs
貞|9|さだ|Upright
靖|13|やすんじる|Peaceful
鑑|23|かんがみる|Specimen
飼|13|かう|Domesticate
陰|11|かげ|Shade
銘|14|めい|Inscription
随|12|まにまに|Follow
烈|10|はげしい|Ardent
尋|12|たずねる|Inquire
稿|15|わら|Draft
丹|4|に|Rust-colored
啓|11|ひらく|Disclose
也|3|なり|To Be (classical)
丘|5|おか|Hill
棟|12|むね|Ridgepole
壌|16|つち|Lot
漫|14|みだりに|Cartoon
玄|5|くろ|Mysterious
粘|11|ねばる|Sticky
悟|10|さとる|Enlightenment
舗|15|ほ|Shop
妊|7|はらむ|Pregnancy
熟|15|うれる|Mellow
旭|6|あさひ|Rising Sun
恩|10|おん|Grace
騰|20|あがる|Leaping Up
往|8|いく|Journey
豆|7|まめ|Beans
遂|12|とげる|Consummate
狂|7|くるう|Lunatic
岐|7|き|Branch Off
陛|10|へい|Highness
緯|16|よこいと|Horizontal
培|11|つちかう|Cultivate
衰|10|おとろえる|Decline
艇|13|てい|Rowboat
屈|8|かがむ|Yield
径|8|みち|Diameter
淡|11|あわい|Thin
抽|8|ひき|Pluck
披|8|ひ|Expose
廷|7|てい|Courts
錦|16|にしき|Brocade
准|10|じゅん|Quasi-
暑|12|あつい|Sultry
磯|17|いそ|Seashore
奨|13|すすめる|Exhort
浸|10|ひたす|Immersed
剰|11|あまつさえ|Surplus
胆|9|きも|Gall Bladder
繊|17|せん|Slender
駒|15|こま|Pony
虚|11|むなしい|Void
霊|15|たま|Spirits
帳|11|とばり|Notebook
悔|9|くいる|Repent
諭|16|さとす|Rebuke
惨|11|みじめ|Wretched
虐|9|しいたげる|Tyrannize
翻|18|ひるがえる|Flip
墜|15|おちる|Crash
沼|8|ぬま|Marsh
据|11|すえる|Set
肥|8|こえる|Fertilizer
徐|10|おもむろに|Gradually
糖|16|とう|Sugar
搭|12|とう|Board
盾|9|たて|Shield
脈|10|すじ|Vein
滝|13|たき|Waterfall
軌|9|き|Rut
俵|10|たわら|Bag
妨|7|さまたげる|Disturb
擦|17|する|Grate
鯨|19|くじら|Whale
荘|9|ほうき|Villa
諾|15|だく|Consent
雷|13|かみなり|Thunder
漂|14|ただよう|Drift
懐|16|ふところ|Pocket
勘|11|かん|Intuition
栽|10|さい|Plantation
拐|8|かい|Kidnap
駄|14|だ|Burdensome
添|11|そえる|Annexed
冠|9|かんむり|Crown
斜|11|ななめ|Diagonal
鏡|19|かがみ|Mirror
聡|14|さとい|Wise
浪|10|ろう|Wandering
亜|7|つぐ|Asia
覧|17|みる|Perusal
詐|12|いつわる|Lie
壇|16|だん|Podium
勲|15|いさお|Meritorious Deed
魔|21|ま|Witch
酬|13|むくいる|Repay
紫|12|むらさき|Purple
曙|17|あけぼの|Dawn
紋|10|もん|Family Crest
卸|9|おろす|Wholesale
奮|16|ふるう|Stirred Up
欄|20|てすり|Column
逸|11|それる|Deviate
涯|11|はて|Horizon
拓|8|ひらく|Clear (the Land)
眼|11|まなこ|Eyeball
獄|14|ごく|Prison
尚|8|なお|Esteem
彫|11|ほる|Carve
穏|16|おだやか|Calm
顕|18|あきらか|Appear
巧|5|たくみ|Adroit
矛|5|ほこ|Halberd
垣|9|かき|Hedge
欺|12|あざむく|Deceit
釣|11|つる|Angling
萩|12|はぎ|Bush Clover
粛|11|つつしむ|Solemn
栗|10|くり|Chestnut
愚|13|おろか|Foolish
嘉|14|よみする|Applaud
遭|14|あう|Encounter
架|9|かける|Erect
鬼|10|おに|Ghost
庶|11|しょ|Commoner
稚|13|いとけない|Immature
滋|12|じ|Nourishing
幻|4|まぼろし|Phantasm
煮|12|にる|Boil
姫|10|ひめ|Princess
誓|14|ちかう|Vow
把|7|は|Grasp
践|13|ふむ|Tread
呈|7|てい|Display
疎|12|うとい|Alienate
仰|6|あおぐ|Face-up
剛|10|ごう|Sturdy
疾|10|はやい|Rapidly
征|8|せい|Subjugate
砕|9|くだく|Smash
謡|16|うたい|Song
嫁|13|よめ|Marry Into
謙|17|へりくだる|Self-effacing
后|6|きさき|Empress
嘆|13|なげく|Sigh
菌|11|きん|Germ
鎌|18|かま|Sickle
巣|11|す|Nest
頻|17|しきりに|Repeatedly
琴|12|こと|Harp
班|10|はん|Squad
棚|12|たな|Shelf
潔|15|いさぎよい|Undefiled
酷|14|ひどい|Cruel
宰|10|さい|Superintend
廊|12|ろう|Corridor
寂|11|さび|Loneliness
辰|7|たつ|Sign Of The Dragon
霞|17|かすみ|Be Hazy
伏|6|ふせる|Prostrated
碁|13|ご|Go
俗|9|ぞく|Vulgar
漠|13|ばく|Vague
邪|8|よこしま|Wicked
晶|12|しょう|Sparkle
墨|14|すみ|Black Ink
鎮|18|しずめる|Tranquilize
洞|9|ほら|Den
履|15|はく|Perform
劣|6|おとる|Inferiority
那|7|なに|What?
殴|8|なぐる|Assault
娠|10|しん|With Child
奉|8|たてまつる|Observance
憂|15|うれえる|Melancholy
朴|6|ほう|Crude
亭|9|てい|Pavilion
淳|11|あつい|Pure
怪|8|あやしい|Suspicious
鳩|13|はと|Pigeon
酔|11|よう|Drunk
惜|11|おしい|Pity
穫|18|かく|Harvest
佳|8|か|Excellent
潤|15|うるおう|Wet
悼|11|いたむ|Lament
乏|4|とぼしい|Destitution
該|13|がい|Above-stated
赴|9|おもむく|Proceed
桑|10|くわ|Mulberry
桂|10|かつら|Japanese Judas-tree
髄|19|ずい|Marrow
虎|8|とら|Tiger
盆|9|ぼん|Basin
晋|10|すすむ|Advance
穂|15|ほ|Ear
壮|6|さかん|Robust
堤|12|つつみ|Dike
飢|10|うえる|Hungry
傍|12|かたわら|Bystander
疫|9|えき|Epidemic
累|11|るい|Accumulate
痴|13|しれる|Stupid
搬|13|はん|Conveyor
晃|10|あきらか|Clear
癒|18|いえる|Healing
桐|10|きり|Paulownia
寸|3|すん|Measurement
郭|11|くるわ|Enclosure
尿|7|ゆばり|Urine
凶|4|きょう|Villain
吐|6|はく|Spit
宴|10|うたげ|Banquet
鷹|24|たか|Hawk
賓|15|ひん|V.i.p.
虜|13|とりこ|Captive
陶|11|すえ|Pottery
鐘|20|かね|Bell
憾|16|うらむ|Remorse
猪|11|い|Boar
紘|10|おおづな|Large
磁|14|じ|Magnet
弥|8|や|All The More
昆|8|こん|Descendants
粗|11|あらい|Coarse
訂|9|ただす|Revise
芽|8|め|Bud
庄|6|しょう|Level
傘|12|かさ|Umbrella
敦|12|あつい|Industry
騎|18|き|Equestrian
寧|14|むしろ|Rather
循|12|じゅん|Sequential
忍|7|しのぶ|Endure
怠|9|おこたる|Neglect
如|6|ごとし|Likeness
寮|15|りょう|Dormitory
祐|9|たすける|Help
鵬|19|おおとり|Phoenix
鉛|13|なまり|Lead
珠|10|たま|Pearl
凝|16|こる|Congeal
苗|8|なえ|Seedling
獣|16|けもの|Animal
哀|9|あわれ|Pathetic
跳|13|はねる|Hop
匠|6|たくみ|Artisan
垂|8|たれる|Droop
蛇|11|へび|Snake
澄|15|すむ|Lucidity
縫|16|ぬう|Sew
僧|13|そう|Buddhist Priest
眺|11|ながめる|Stare
亘|6|わたる|Span
呉|7|くれる|Give
凡|3|およそ|Commonplace
憩|16|いこい|Recess
媛|12|ひめ|Beautiful Woman
溝|13|みぞ|Gutter
恭|10|うやうやしい|Respect
刈|4|かる|Reap
睡|13|ねむる|Drowsy
錯|16|さく|Confused
伯|7|はく|Chief
笹|11|ささ|Bamboo Grass
穀|14|こく|Cereals
陵|11|みささぎ|Mausoleum
霧|19|きり|Fog
魂|14|たましい|Soul
弊|15|へい|Abuse
妃|6|きさき|Queen
舶|11|はく|Liner
餓|15|うえる|Starve
窮|15|きわめる|Hard Up
掌|12|てのひら|Manipulate
麗|19|うるわしい|Lovely
綾|14|あや|Design
臭|9|くさい|Stinking
悦|10|よろこぶ|Ecstasy
刃|3|は|Blade
縛|16|しばる|Truss
暦|14|こよみ|Calendar
宜|8|よろしい|Best Regards
盲|8|めくら|Blind
粋|10|いき|Chic
辱|10|はずかしめる|Embarrass
毅|15|つよい|Strong
轄|17|くさび|Control
猿|13|さる|Monkey
弦|8|つる|Bowstring
稔|13|みのる|Harvest
窒|11|ちつ|Plug Up
炊|8|たく|Cook
洪|9|こう|Deluge
摂|13|おさめる|Vicarious
飽|13|あきる|Sated
冗|4|じょう|Superfluous
桃|10|もも|Peach
狩|9|かる|Hunt
朱|6|あけ|Vermilion
渦|12|うず|Whirlpool
紳|11|しん|Sire
枢|8|とぼそ|Hinge
碑|14|いしぶみ|Tombstone
鍛|17|きたえる|Forge
刀|2|かたな|Sword
鼓|13|つづみ|Drum
裸|13|はだか|Naked
猶|12|なお|Furthermore
塊|13|かたまり|Clod
旋|11|めぐる|Rotation
弓|3|ゆみ|Bow
幣|15|ぬさ|Cash
膜|14|まく|Membrane
扇|10|おうぎ|Fan
腸|13|はらわた|Intestines
槽|15|ふね|Vat
慈|13|いつくしむ|Mercy
楊|13|やなぎ|Willow
伐|6|きる|Fell
駿|17|すぐれる|A Good Horse
漬|14|つける|Pickling
糾|9|ただす|Twist
亮|9|あきらか|Clear
墳|15|ふん|Tomb
坪|8|つぼ|Two-mat Area
紺|11|こん|Dark Blue
娯|10|ご|Recreation
椿|13|つばき|Camellia
舌|6|した|Tongue
羅|19|うすもの|Gauze
峡|9|はざま|Gorge
俸|10|ほう|Stipend
厘|9|りん|Rin
峰|10|みね|Summit
圭|6|けい|Square Jewel
醸|20|かもす|Brew
蓮|13|はす|Lotus
弔|4|とむらう|Condolences
乙|1|おと|The Latter
汁|5|しる|Soup
尼|5|あま|Nun
遍|12|あまねく|Everywhere
衡|16|こう|Equilibrium
薫|16|かおる|Send Forth Fragrance
猟|11|かり|Game-hunting
羊|6|ひつじ|Sheep
款|12|かん|Goodwill
閲|15|けみする|Review
偵|11|てい|Spy
喝|11|かつ|Hoarse
敢|12|あえて|Daring
胎|9|たい|Womb
酵|14|こう|Fermentation
憤|15|いきどおる|Aroused
豚|11|ぶた|Pork
遮|14|さえぎる|Intercept
扉|12|とびら|Front Door
硫|12|りゅう|Sulphur
赦|11|しゃ|Pardon
窃|9|ぬすむ|Stealth
泡|8|あわ|Bubbles
瑞|13|みず|Congratulations
又|2|また|Or Again
慨|13|がい|Rue
紡|10|つむぐ|Spinning
恨|9|うらむ|Regret
肪|8|ぼう|Obese
扶|7|たすける|Aid
戯|15|たわむれる|Frolic
伍|6|いつつ|Five
忌|7|いむ|Mourning
濁|16|にごる|Voiced
奔|8|はしる|Run
斗|4|と|Big Dipper
蘭|19|らん|Orchid
迅|6|じん|Swift
肖|7|あやかる|Resemblance
鉢|13|はち|Bowl
朽|6|くちる|Decay
殻|11|から|Husk
享|8|うける|Enjoy
秦|10|はた|Manchu Dynasty
茅|8|かや|Miscanthus Reed
藩|18|はん|Clan
沙|7|すな|Sand
輔|14|たすける|Help
媒|12|なこうど|Mediator
鶏|19|にわとり|Chicken
禅|13|しずか|Zen
嘱|15|しょくする|Entrust
胴|10|どう|Trunk
迭|8|てつ|Transfer
挿|10|さす|Insert
嵐|12|あらし|Storm
椎|12|つち|Chinquapin
絹|13|きぬ|Silk
陪|11|ばい|Obeisance
剖|10|ぼう|Divide
譜|19|ふ|Musical Score
郁|9|いく|Cultural Progress
悠|11|ゆう|Permanence
淑|11|しとやか|Graceful
帆|6|ほ|Sail
暁|12|あかつき|Daybreak
傑|13|すぐれる|Greatness
楠|13|くす|Camphor Tree
笛|11|ふえ|Flute
玲|9|れい|Sound Of Jewels
奴|5|やつ|Guy
錠|16|じょう|Lock
拳|10|こぶし|Fist
翔|12|かける|Soar
遷|15|うつる|Transition
拙|8|つたない|Bungling
侍|8|さむらい|Waiter
尺|4|しゃく|Shaku
峠|9|とうげ|Mountain Peak
篤|16|あつい|Fervent
肇|14|はじめる|Beginning
渇|11|かわく|Thirst
叔|8|しゅく|Uncle
雌|14|め|Feminine
亨|7|とおる|Pass Through
堪|12|たえる|Withstand
叙|9|ついず|Confer
酢|12|す|Vinegar
吟|7|ぎん|Versify
逓|10|かわる|Relay
嶺|17|みね|Peak
甚|9|はなはだ|Tremendously
喬|12|たかい|High
崇|11|あがめる|Adore
漆|14|うるし|Lacquer
岬|8|みさき|Headland
癖|18|くせ|Mannerism
愉|12|たのしい|Pleasure
寅|11|とら|Sign Of The Tiger
礁|17|しょう|Reef
乃|2|の|From
洲|9|しま|Continent
屯|4|たむろ|Barracks
樺|14|かば|Birch
槙|14|まき|Twig
姻|9|いん|Matrimony
巌|20|いわ|Rock
擬|17|まがい|Mimic
塀|12|へい|Fence
唇|10|くちびる|Lips
睦|13|むつまじい|Intimate
閑|12|かん|Leisure
胡|9|なんぞ|Barbarian
幽|9|ふかい|Seclude
峻|10|けわしい|High
曹|11|そう|Office
詠|12|よむ|Recitation
卑|9|いやしい|Lowly
侮|8|あなどる|Scorn
鋳|15|いる|Casting
抹|8|まつ|Rub
尉|11|い|Military Officer
槻|15|つき|Zelkova Tree
隷|16|したがう|Slave
禍|13|わざわい|Calamity
蝶|15|ちょう|Butterfly
酪|13|らく|Dairy Products
茎|8|くき|Stalk
帥|9|すい|Commander
逝|10|ゆく|Departed
汽|7|き|Vapor
琢|11|みがく|Polish
匿|10|かくまう|Hide
襟|18|えり|Collar
蛍|11|ほたる|Lightning-bug
蕉|15|しょう|Banana
寡|14|か|Widow
琉|11|りゅう|Precious Stone
痢|12|り|Diarrhea
庸|11|よう|Commonplace
朋|8|とも|Companion
坑|7|こう|Pit
藍|18|あい|Indigo
賊|13|ぞく|Burglar
搾|13|しぼる|Squeeze
畔|10|あぜ|Paddy Ridge
遼|15|りょう|Distant
唄|10|うた|Song
孔|4|あな|Cavity
橘|16|たちばな|Mandarin Orange
漱|14|くちすすぐ|Gargle
呂|7|せぼね|Spine
拷|9|ごう|Torture
嬢|16|むすめ|Lass
苑|8|その|Garden
巽|12|たつみ|Southeast
杜|7|もり|Woods
渓|11|たに|Mountain Stream
翁|10|おきな|Venerable Old Man
廉|13|れん|Bargain
謹|17|つつしむ|Discreet
瞳|17|ひとみ|Pupil (of Eye)
湧|12|わく|Boil
欣|8|よろこぶ|Take Pleasure In
窯|15|かま|Kiln
褒|15|ほめる|Praise
醜|17|みにくい|Ugly
升|4|ます|Measuring Box
殉|10|じゅん|Martyrdom
煩|13|わずらう|Anxiety
巴|4|ともえ|Comma-design
禎|13|さいわい|Happiness
劾|8|がい|Censure
堕|12|おちる|Degenerate
租|10|そ|Tariff
稜|13|いつ|Angle
桟|10|かけはし|Scaffold
倭|10|やまと|Yamato
婿|12|むこ|Bridegroom
慕|14|したう|Pining
斐|12|ひ|Beautiful
罷|15|まかり|Quit
矯|17|ためる|Rectify
某|9|それがし|So-and-so
囚|5|とらわれる|Captured
魁|14|さきがけ|Charging Ahead Of Others
虹|9|にじ|Rainbow
鴻|17|おおとり|Large Bird
泌|8|ひつ|Ooze
於|8|おいて|At
赳|10|きゅう|Strong And Brave
漸|14|ようやく|Steadily
蚊|10|か|Mosquito
葵|12|あおい|Hollyhock
厄|4|やく|Unlucky
藻|19|も|Seaweed
禄|12|さいわい|Fief
孟|8|かしら|Chief
嫡|14|ちゃく|Legitimate Wife
尭|8|たかい|High
嚇|17|おどす|Menacing
巳|3|み|Sign Of The Snake Or Serpent
凸|5|でこ|Convex
暢|14|のびる|Stretch
韻|19|いん|Rhyme
霜|17|しも|Frost
硝|12|しょう|Nitrate
勅|9|いましめる|Imperial Order
芹|7|せり|Parsley
杏|7|あんず|Apricot
棺|12|かん|Coffin
儒|16|じゅ|Confucian
鳳|14|ほう|Male Mythical Bird
馨|20|かおる|Fragrant
慧|15|さとい|Wise
愁|13|うれえる|Distress
楼|13|たかどの|Watchtower
彬|11|うるわしい|Refined
匡|6|すくう|Correct
眉|9|まゆ|Eyebrow
欽|12|つつしむ|Respect
薪|16|たきぎ|Fuel
褐|13|かつ|Brown
賜|15|たまわる|Grant
嵯|13|さ|Steep
綜|14|おさめる|Rule
繕|18|つくろう|Darning
栓|10|せん|Plug
翠|14|かわせみ|Green
鮎|16|あゆ|Freshwater Trout
榛|14|はしばみ|Hazelnut
凹|5|くぼむ|Concave
艶|19|つや|Glossy
惣|12|すべて|All
蔦|14|つた|Vine
錬|16|ねる|Tempering
隼|10|はやぶさ|Falcon
渚|11|なぎさ|Strand
衷|10|ちゅう|Inmost
逐|10|ちく|Pursue
斥|5|しりぞける|Reject
稀|12|まれ|Rare
芙|7|ふ|Lotus
詔|12|みことのり|Imperial Edict
皐|11|さつき|Swamp
雛|18|ひな|Chick
惟|11|おもんみる|Consider
佑|7|たすける|Help
耀|20|かがやく|Shine
黛|16|まゆずみ|Blackened Eyebrows
渥|12|あつい|Kindness
憧|15|あこがれる|Yearn After
宵|10|よい|Wee Hours
妄|6|みだりに|Delusion
惇|11|あつい|Sincere
脩|11|おさめる|Dried Meat
甫|7|はじめて|For The First Time
酌|10|くむ|Bar-tending
蚕|10|かいこ|Silkworm
嬉|15|うれしい|Glad
蒼|13|あおい|Blue
暉|13|かがやく|Shine
頒|13|わかつ|Distribute
只|5|ただ|Only
肢|8|し|Limb
檀|17|まゆみ|Cedar
凱|12|かちどき|Victory Song
彗|11|ほうき|Comet
謄|17|とう|Mimeograph
梓|11|あずさ|Catalpa Tree
丑|4|うし|Sign Of The Ox Or Cow
嗣|13|し|Heir
叶|5|かなえる|Grant
汐|6|しお|Eventide
絢|12|けん|Brilliant Fabric Design
朔|10|ついたち|Conjunction (astronomy)
伽|7|とぎ|Nursing
畝|10|せ|Furrow
抄|7|しょう|Extract
爽|11|あきらか|Refreshing
黎|15|くろい|Dark
惰|12|だ|Lazy
蛮|12|えびす|Barbarian
冴|7|さえる|Be Clear
旺|8|かがやき|Flourishing
萌|11|もえる|Show Symptoms Of
偲|11|しのぶ|Recollect
壱|7|ひとつ|One (in Documents)
瑠|14|る|Lapis Lazuli
允|4|じょう|License
侯|9|こう|Marquis
蒔|13|うえる|Sow (seeds)
鯉|18|こい|Carp
弧|9|こ|Arc
遥|12|はるか|Far Off
舜|13|しゅん|Type Of Morning Glory
瑛|12|えい|Sparkle Of Jewelry
附|8|つける|Affixed
彪|11|あや|Spotted
卯|5|う|Sign Of The Hare Or Rabbit
但|7|ただし|However
綺|14|あや|Figured Cloth
芋|6|いも|Potato
茜|9|あかね|Madder
凌|10|しのぐ|Endure
皓|12|しろい|White
洸|9|こう|Sparkling Water
毬|11|いが|Burr
婆|11|ばば|Old Woman
緋|14|あけ|Scarlet
鯛|19|たい|Sea Bream
怜|8|あわれむ|Wise
邑|7|むら|Village
倣|10|ならう|Emulate
碧|14|へき|Blue
啄|10|ついばむ|Peck
穣|18|わら|Good Crops
酉|7|とり|West
悌|10|てい|Serving Our Elders
倹|10|つましい|Frugal
柚|9|ゆず|Citron
繭|18|まゆ|Cocoon
且|5|かつ|Moreover
丙|5|ひのえ|Third Class
丞|6|すくう|Help
亥|6|い|Sign Of The Hog
亦|6|また|Also
伎|6|わざ|Deed
伶|7|わざおぎ|Actor
侃|8|つよい|Strong
侑|8|すすめる|Urge To Eat
倖|10|しあわせ|Happiness
冶|7|いる|Melting
凜|15|きびしい|Cold
凪|6|なぎ|Lull
勁|9|つよい|Strong
勺|3|しゃく|Ladle
匁|4|もんめ|Monme
叡|16|あきらか|Intelligence
吏|6|り|Officer
哉|9|かな|How
塑|13|でく|Model
墾|16|はる|Ground-breaking
奎|9|けい|Star
宥|9|なだめる|Soothe
崚|11|りょう|Mountains Towering In A Row
嵩|13|かさ|Be Aggravated
弐|6|ふたつ|Ii
恕|10|ゆるす|Excuse
捷|11|はやい|Victory
捺|11|さす|Press
斤|4|きん|Axe
旦|5|あきらか|Daybreak
昂|8|あがる|Rise
昴|9|すばる|The Pleiades
晏|10|おそい|Late
晟|10|あきらか|Clear
晨|11|あした|Morning
朕|10|ちん|Majestic Plural
柊|9|ひいらぎ|Holly
柾|9|まさ|Straight Grain
栞|10|しおり|Bookmark
梢|11|こずえ|Treetops
梧|11|あおぎり|Chinese Parasol Tree
椋|12|むく|Type Of Deciduous Tree
椰|13|やし|Coconut Tree
楓|13|かえで|Maple
汰|7|おごる|Washing
洵|9|のぶ|Alike
滉|13|ひろい|Deep And Broad
澪|16|みお|Water Route
濫|18|みだりに|Excessive
熙|15|たのしむ|Bright
燎|16|かがりび|Burn
燦|17|さんたる|Brilliant
燿|18|かがやく|Shine
爵|17|しゃく|Baron
爾|14|なんじ|You
玖|7|きゅう|Beautiful Black Jewel
琳|12|りん|Jewel
瑚|13|こ|Ancestral Offering Receptacle
瑳|14|みがく|Polish
瑶|13|たま|Beautiful As A Jewel
璃|15|り|Glassy
痘|12|とう|Pox
眸|11|ひとみ|Pupil Of The Eye
瞭|17|あきらか|Clear
碩|14|おおきい|Large
竣|12|わらわ|End
笙|11|ふえ|A Reed Instrument
箇|14|か|Counter For Articles
紗|10|うすぎぬ|Gauze
紬|11|つむぎ|Pongee (a Knotted Silk Cloth)
絃|11|いと|String
綸|14|いと|Thread
耗|10|もう|Decrease
耶|9|か|Question Mark
胤|9|たね|Descendent
脹|12|はれる|Dilate
茄|8|か|Eggplant
茉|8|まつ|Jasmine
莉|10|り|Jasmine
莞|10|い|Smiling
菖|11|しょう|Iris
菫|11|すみれ|The Violet
蓉|13|よう|Lotus
蕗|16|ふき|Butterbur
虞|13|おそれ|Fear
衿|9|えり|Neck
袈|11|け|A Coarse Camlet
裟|13|さ|Buddhist Surplice
詢|13|はかる|Consult With
誼|15|よしみ|Friendship
諄|15|ひちくどい|Tedious
諒|15|あきらか|Fact
謁|15|えつ|Audience
賦|15|ふ|Levy
迪|8|みち|Edify
遵|15|じゅん|Abide By
采|8|とる|Dice
銑|14|せん|Pig Iron
錘|16|つむ|Weight
鞠|17|まり|Ball
頌|13|かたち|Eulogy
颯|14|さっと|Sudden
麟|24|りん|Chinese Unicorn
麿|18|まろ|I
`;

export const N5 = parse(N5_TABLE);
export const N4 = parse(N4_TABLE);
export const N3 = parse(N3_TABLE);
export const N2 = parse(N2_TABLE);
export const N1 = parse(N1_TABLE);

const BY_LEVEL = { N5, N4, N3, N2, N1 };

export function kanjiLessons(): Lesson[] {
  const lessons: Lesson[] = [];
  for (const level of ['N5', 'N4', 'N3', 'N2', 'N1'] as const) {
    for (const entry of BY_LEVEL[level]) {
      lessons.push({
        id: 'kanji-' + level + '-' + entry.c,
        category: 'japanese',
        group: level,
        title: entry.c + '  ' + entry.r,
        subTitle: entry.s + ' trazos · ' + entry.m,
        instructions: 'El primer cuadrado es el ejemplo. Copia el kanji en los demás: cada copia se califica por separado. El orden, la dirección y el remate cuentan.',
        characterOrWord: entry.c,
        recommendedTool: 'fude',
        suggestedGrid: 'genkouyoushi',
        strokesExpected: entry.s,
        reading: entry.r,
        meaning: entry.m
      });
    }
  }
  return lessons;
}
