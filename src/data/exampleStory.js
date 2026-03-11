/**
 * Localized example / demo story for InkFlow.
 *
 * All IDs are fixed so the story can be seeded once without duplicates.
 * Text content is available in EN, ZH, ES, FR.
 *
 * Usage:
 *   import { getLocalizedExampleStory, EXAMPLE_STORY_ID } from '@/data/exampleStory.js';
 *   const data = getLocalizedExampleStory('zh'); // story, characters, chapters, scenes, ideas
 */

export const EXAMPLE_STORY_ID = 'inkflow-example-story';

const CHAR_MARA  = 'inkflow-example-char-mara';
const CHAR_LEVI  = 'inkflow-example-char-levi';
const CH_1 = 'inkflow-example-ch-1';
const CH_2 = 'inkflow-example-ch-2';
const CH_3 = 'inkflow-example-ch-3';
const CH_4 = 'inkflow-example-ch-4';
const CH_5 = 'inkflow-example-ch-5';

// Fixed timestamp so the example doesn't surface as "just updated"
const T = 1_700_000_000_000;

// ─── Locale content ──────────────────────────────────────────────────────────

const content = {

  // ── English ────────────────────────────────────────────────────────────────
  en: {
    story: {
      oneSentence: 'A reclusive lighthouse keeper and former code-breaker must decode a ten-year-old cipher to save a stranger—and finally forgive herself.',
      setup:
        'Mara Chen, 42, lives alone in a decommissioned lighthouse on a fog-bound island, tending the light as a private contractor. A decade ago she was a cryptanalyst for a government intelligence unit; a botched operation got her partner killed and she has not left the island since. The world outside feels too loud, too dangerous.\n\nOne night a violent autumn storm rolls in and Mara intercepts a weak radio signal. The transmission is garbled but the cipher pattern is unmistakable: the same proprietary code her old unit used, a system she helped design. Nobody alive should still be using it—or know it even exists.',
      disaster1:
        'Mara decodes the signal. It is a distress call with GPS coordinates half a kilometer off the rocky shoals—a boat is sinking. She radios the coast guard, but the duty officer dismisses her: no vessel is registered in that area, radar shows nothing. Mara knows the coordinates are real.\n\nShe drags her old fibreglass skiff into the water and rows into the storm alone. The sea tries to kill her three times before she finds the half-submerged hull. She hauls the barely-conscious man out. As she turns for home she sees a tattoo on his wrist—the same lighthouse emblem her unit used as a team symbol—and her blood goes cold.',
      disaster2:
        'Back at the lighthouse Mara warms the young man, Levi, 24, and discovers who he is: the son of her dead partner, Kenji Nakamura. Levi has spent two years tracking her down. He is not here by accident.\n\nHe gives her the key to an encrypted message Kenji left for her. Reading even the first lines forces Mara to relive the operation in detail. She wants Levi gone and the letter burned. But he also delivers a second piece of news: someone from the old network is looking for both of them now, and they are not friendly.',
      disaster3:
        'A fast rigid-hull inflatable appears in the cove: two operatives from a criminal syndicate that acquired the intelligence unit\'s assets. They believe Mara still holds the master-key archive from the old cipher system—keys that could expose fifteen years of intercepted communications.\n\nMara has two hours and no weapons. She and Levi rig a radio burst using the lighthouse hardware. Their play: broadcast the archive to every news server and government inbox Mara memorised, so the data becomes worthless to suppress. But to unlock it she must use the last key Kenji sent—meaning she has to finish reading his letter.',
      ending:
        'The broadcast goes out seconds before the operatives breach the lamp room. With the archive already public and a coast guard cutter rounding the headland, the operatives retreat.\n\nKenji\'s message, read in full, says he did not blame her—he knew the operation was compromised from the inside and had tried to warn her. His death was not her fault. Mara sits with that truth all winter. In spring she opens the lighthouse to visitors as a working maritime museum. Levi helps her restore the original Fresnel lens. The light still turns every night, but now other people can see it too.',
    },
    mara: {
      name: 'Mara Chen',
      oneSentence: 'A brilliant, self-exiled cryptanalyst who has traded human connection for the certainty of a lighthouse beam.',
      goal: 'Keep the world at arm\'s length and avoid reliving the mission that killed her partner.',
      motivation: 'Mara carries crushing guilt: she believes her read of the intelligence was wrong and that Kenji died because of her error. Isolation is her penance and her protection—if she cares about nothing, she can lose nothing again.',
      conflict: 'The coded signal pulls her back into the world she fled, and Levi\'s presence makes neutrality impossible. Every step she takes to help him forces her to confront the story she has told herself about the past.',
      epiphany: 'Mara finally opens Kenji\'s last message and learns the truth: the operation was sabotaged from within, and Kenji knew and forgave her. Her guilt was built on a lie. She can stop punishing herself and start living again.',
    },
    levi: {
      name: 'Levi Nakamura',
      oneSentence: 'A young engineer driven by love for his father and a need to understand the truth of his death—even if the truth is harder than the story.',
      goal: 'Deliver his father\'s final message to Mara and find out what really happened the night Kenji died.',
      motivation: 'Levi idolised his father and has spent years suspecting the official account. He is not angry at Mara—he wants answers, and he senses she is the only person honest enough to give them.',
      conflict: 'Levi arrives believing he is ready to hear the truth, but the real truth—that his father willingly sacrificed himself in a situation with no good options—is more painful than blame would have been.',
      epiphany: 'His father\'s message was not about blame or absolution; it was about love. Kenji wanted Levi to grow up free of a vendetta. Levi\'s long search ends not with justice but with peace.',
    },
    chapters: [
      {
        title: 'The Lighthouse at the Edge of Everything',
        summary: 'We meet Mara on her island, settled into her solitary routine, and feel the weight of what she is hiding from. The storm begins and the strange signal arrives.',
      },
      {
        title: 'Into the Storm',
        summary: 'Mara defies the coast guard and rows out to the wreck. She rescues Levi and recognises the tattoo on his wrist—the first crack in her armour.',
      },
      {
        title: 'Kenji\'s Son',
        summary: 'Levi reveals who he is and why he came. Mara reads part of the encrypted message and is overwhelmed by grief and guilt. She tries to push Levi away—and learns they are both in danger.',
      },
      {
        title: 'The Archive',
        summary: 'The syndicate arrives. Mara and Levi race against the clock to unlock the master archive and broadcast it before the operatives reach the lamp room.',
      },
      {
        title: 'The Light Turns',
        summary: 'The broadcast succeeds. Mara reads the rest of Kenji\'s message—and finally understands. Months later she opens the lighthouse to the world.',
      },
    ],
    scenes: [
      // CH 1
      { title: 'Morning Routine', summary: 'Mara performs her dawn routine—checking the light, logging the weather, speaking to no one—while we learn the shape of her self-imposed exile.', notes: 'Establish tone: spare, precise, a little melancholy. Use sensory details—salt, fog, the mechanical click of the lighthouse clock—to show a world Mara controls completely. Avoid backstory dumps; let her actions speak.', content: 'The light clicked off at 05:47, three minutes before nautical dawn, exactly as it had every morning for six years.\n\nMara Chen stood at the lantern-room rail and watched the fog burn away in thin strips. Below, the sea was the colour of old pewter. She noted the time, the visibility, the barometric pressure—21 millibars lower than yesterday, still falling—in the logbook she kept by hand because the satellite uplink was for emergencies only.' },
      { title: 'The Storm Rolls In', summary: 'The afternoon sky turns ugly; Mara battens down the lighthouse and settles in to ride out the storm—then her shortwave crackles to life.', notes: 'Pacing shift: move from stillness to urgency. The signal should feel deeply wrong to Mara—not just unexpected noise but something that violates the physics of her safe world.', content: '' },
      { title: 'A Cipher She Designed', summary: 'Mara decodes enough of the signal to confirm what she feared: it is using her old unit\'s proprietary cipher, and it is a distress call.', notes: 'Show her professional instinct kicking in before her emotions catch up. She solves the cipher almost automatically, then stops cold when she understands what she has solved.', content: '' },
      // CH 2
      { title: 'Dismissed', summary: 'The coast guard duty officer refuses to act; Mara makes a decision that surprises even herself.', notes: 'Keep the coast-guard call brief and bureaucratic—that\'s what makes it infuriating. Mara\'s decision to go anyway should feel inevitable, not heroic.', content: '' },
      { title: 'The Shoals', summary: 'Mara rows through the storm and finds the half-submerged hull; rescuing Levi is harder and more dangerous than she expected.', notes: 'Action set-piece. Keep the focus tight: wind, water, the weight of another person. No room for interiority here—pure survival.', content: '' },
      { title: 'The Tattoo', summary: 'Safe inside the lighthouse, Mara notices Levi\'s wrist tattoo—the old unit\'s emblem—and her relief at rescuing him turns to something much colder.', notes: 'End-of-chapter reversal. One image does the work of pages of exposition. Mara does not say anything aloud—let her silence carry it.', content: '' },
      // CH 3
      { title: 'Kenji\'s Son', summary: 'Levi introduces himself properly; Mara has to decide whether to throw him out or hear him out.', notes: 'First scene from Levi\'s POV. He is nervous but determined. He has rehearsed this conversation a hundred times and it is going nothing like he planned.', content: '' },
      { title: 'The Encrypted Letter', summary: 'Levi gives Mara the key to her dead partner\'s final message; she reads the first part and has to leave the room.', notes: 'Emotional core of the second act. The letter should be written in a voice that is clearly Kenji\'s—warm, precise, a little wry—even though we have never met him.', content: '' },
      { title: 'Someone is Coming', summary: 'Levi spots a fast boat that does not match any fishing pattern; Mara recognises the silhouette.', notes: 'Transition to the external threat. End the chapter on action, not emotion—the danger arriving outside is a relief from the harder danger inside.', content: '' },
      // CH 4
      { title: 'Two Hours', summary: 'Mara lays out the situation and the plan; Levi realises what she is asking him to help build.', notes: 'Planning scene. Should feel like a thriller procedure—specific, technical, propulsive—while also being about two people choosing to trust each other under pressure.', content: '' },
      { title: 'The Key', summary: 'To unlock the archive Mara must use the key Kenji sent—meaning she has to finish reading his letter. She does.', notes: 'The emotional climax woven into the thriller climax. Do not rush it. The archive unlocking is almost beside the point—what matters is what the letter says.', content: '' },
      { title: 'Broadcast', summary: 'Mara transmits the archive seconds before the operatives breach the lamp room; the coast guard cutter rounds the headland.', notes: 'Race-against-the-clock payoff. Keep sentences short and punchy. The emotional weight goes on the moment Mara hits send.', content: '' },
      // CH 5
      { title: 'The Rest of the Letter', summary: 'With the threat over, Mara finally reads Kenji\'s message to the end—and finds out what really happened that night.', notes: 'Quiet after the storm. This is the scene the whole story has been building to. Let it breathe. No action, no urgency—just Mara and the page.', content: '' },
      { title: 'Spring Opening', summary: 'Months later, Mara and Levi prepare the lighthouse for its first public visitors; Mara switches on the light in front of an audience for the first time.', notes: 'Epilogue scene. Small, warm, image-driven. The light turning on in front of witnesses is the visual metaphor for everything—Mara is no longer hiding.', content: 'She had not expected to feel nervous.\n\nThirty-seven people stood on the gallery below the lamp room. Some were birders who had taken the seasonal ferry for the puffins. Some were from the maritime heritage society. Three were journalists. One was Levi, standing near the back with his hands in his pockets, pretending he was not watching her.\n\nMara looked at the Fresnel lens—the original, re-seated after four months of restoration work—and then at the switch.\n\nShe threw it.\n\nThe light began to turn.' },
    ],
    ideas: [
      { type: 'plot',      title: 'The saboteur\'s identity',          body: 'The insider who compromised the original mission should be a named character—consider making it someone Mara trusted professionally but never liked personally. The reveal can happen off-page (in the leaked archive) so we don\'t need a villain POV chapter.' },
      { type: 'character', title: 'Mara\'s relationship with routine', body: 'Her daily log entries are a coping mechanism, not just a job duty. She writes them by hand because a typed record would be too easy to delete. Everything she refuses to say out loud goes into those pages. Consider whether the log entries become a framing device or stay invisible to the reader.' },
      { type: 'scene',     title: 'Draft Kenji\'s letter first',       body: 'Write Kenji\'s letter in full before drafting chapters 3–4, so his voice is consistent across both times Mara reads it. The first read (Ch 3) shows only the opening—enough to wound her. The second read (Ch 4) completes it. Write the whole letter now so you can cut it correctly later.' },
      { type: 'world',     title: 'Island and lighthouse geography',    body: 'The island should be small enough that two characters cannot avoid each other—one path, one building. The cove where Mara keeps the skiff is visible from the lamp room gallery, which is how Levi spots the incoming boat. The lamp room is above everything; scenes set there feel exposed and symbolic.' },
    ],
  },

  // ── Chinese (Simplified) ───────────────────────────────────────────────────
  zh: {
    story: {
      oneSentence: '一位隐居的女灯塔管理员、昔日的密码分析师，必须破译一段尘封十年的密码，才能救下陌生人——也终于原谅自己。',
      setup:
        '陈玛拉，42岁，独居于海雾笼罩的小岛上一座废弃灯塔中，以私人承包人身份维护灯光。十年前，她是政府情报机构的密码分析专家；一次失败的行动夺走了她搭档的生命，此后她再未离开小岛。岛外的世界太嘈杂，太危险。\n\n某个深秋暴风夜，玛拉截获了一段微弱的无线电信号。传输内容模糊，但密码模式却无可置疑——正是她当年帮助设计的专属加密方式，一套理应已经湮灭的系统。没有人应该还在使用它，甚至不应该知道它曾经存在。',
      disaster1:
        '玛拉破译了信号。那是一声求救：GPS坐标指向礁石外半公里处的一艘正在下沉的船。她联络海岸警卫队，值班官员却以"雷达上什么都没有"为由驳回了她。玛拉知道那些坐标是真实的。\n\n她独自将老旧的玻璃纤维小艇推入海中，划向暴风雨深处。海浪三次试图将她吞没，终于，她找到了那具半没入水中的船壳。她将奄奄一息的男子拖了出来。转身返航时，她看见了他手腕上的纹身——那个灯塔图案，正是当年小组的徽标——她的血液骤然凝固。',
      disaster2:
        '回到灯塔，玛拉为年轻人取暖，逐渐弄清了他的身份：他叫列维，24岁，正是她死去搭档健二·中村的儿子。列维花了两年时间追踪她，来此绝非偶然。\n\n他带来了健二留给她的一封加密信，并交出了密钥。读到前几行，玛拉便不得不重新经历那次行动的每一个细节。她想让列维离开，让那封信付之一炬。但他还带来了另一个消息：旧网络中的某些人正在寻找他们两个，而那些人的来意绝不友善。',
      disaster3:
        '次日清晨，一艘快速充气艇出现在海湾中：两名来自犯罪集团的特工，那个集团在情报机构解散后收购了其全部资产。他们相信玛拉仍然掌握着旧密码系统的主密钥档案——那些密钥可以解锁十五年的截获通信，让无数权贵人物暴露在阳光下。\n\n玛拉只有两个小时，没有武器。她和列维利用灯塔设备拼凑出一套无线电发射装置。计划只有一个：将档案广播给玛拉记忆中的每一个新闻服务器和政府邮箱，使其公开到无法压制。但要解锁档案，她必须使用健二寄来的最后一把密钥——也就是说，她必须读完那封信。',
      ending:
        '广播在特工破门而入前数秒发出。档案已经公开，海岸警卫队的巡逻艇绕过海岬赶来，特工们撤退了。\n\n健二的信，读到最后，写道他从未怪过她——他早已知道行动从内部遭到破坏，并曾试图警告她。他的死不是她的错。玛拉带着这个真相度过了整个冬天。入春后，她将灯塔作为海事博物馆向公众开放。列维帮她修复了原装的菲涅耳透镜。灯光依然每夜旋转，而如今，有更多的人能够看见它。',
    },
    mara: {
      name: '陈玛拉',
      oneSentence: '一位才华横溢、自我流放的密码分析师，用孤独换取了灯塔光束般确定无疑的安全感。',
      goal: '与世界保持距离，拒绝重温夺走搭档生命的那次任务。',
      motivation: '玛拉承受着压垮性的愧疚：她相信是自己对情报的误判导致了健二的死。孤立既是惩罚，也是保护——若不再在乎任何事，便无从再失去任何事。',
      conflict: '密码信号将她拉回了她逃离的世界，列维的出现令她无法置身事外。每一次伸手相助，都迫使她正视自己关于过去所编造的故事。',
      epiphany: '玛拉终于读完健二的最后一封信，得知了真相：行动遭到内部出卖，健二早已知晓并原谅了她。她的愧疚建立在一个谎言之上。她可以停止自我惩罚，重新开始生活。',
    },
    levi: {
      name: '列维·中村',
      oneSentence: '一个年轻工程师，为父亲的爱所驱动，执着于了解父亲之死的真相——哪怕真相比故事更令人痛苦。',
      goal: '将父亲的最后信息带给玛拉，查清健二去世那夜的真相。',
      motivation: '列维崇拜父亲，多年来一直怀疑官方说法有误。他对玛拉并无愤怒——他想要答案，而他感觉玛拉是唯一诚实到足以给出答案的人。',
      conflict: '列维带着"已经准备好面对真相"的信念而来，但真相——父亲在没有好选择的情况下主动牺牲——远比寻找替罪羊更令人痛苦。',
      epiphany: '父亲的信不是关于指责或宽恕，而是关于爱。健二希望列维不要带着仇恨成长。漫长的追寻，终点不是正义，而是平静。',
    },
    chapters: [
      {
        title: '世界尽头的灯塔',
        summary: '我们在小岛上认识了玛拉，感受她日复一日独处生活的重量，以及她所逃避之事的轮廓。暴风雨来临，奇异信号出现。',
      },
      {
        title: '驶入风暴',
        summary: '玛拉不顾海岸警卫队的拒绝，独自划船驶向残骸。她救出列维，认出了他手腕上的纹身——她铠甲上的第一道裂缝。',
      },
      {
        title: '健二的儿子',
        summary: '列维说出自己的身份和来意。玛拉读了加密信的开头，被悲痛与愧疚淹没。她试图赶走列维——随即得知他们两人都面临危险。',
      },
      {
        title: '档案',
        summary: '犯罪集团到来。玛拉与列维在特工抵达前与时间赛跑，争分夺秒地解锁主密钥档案并将其广播出去。',
      },
      {
        title: '灯光旋转',
        summary: '广播成功发出。玛拉读完了健二信的剩余部分——终于明白了一切。数月后，她向世人开放了灯塔。',
      },
    ],
    scenes: [
      // CH 1
      { title: '清晨的仪式', summary: '玛拉在破晓时分完成例行工作——检查灯光，记录天气，与无人交谈——让我们感受到她自我放逐生活的形状。', notes: '确立基调：简洁、精准、略带忧郁。用感官细节——咸味、海雾、灯塔时钟的机械嘀嗒——展示一个由玛拉完全掌控的世界。避免直接交代背景，用行动代替叙述。', content: '灯光在05:47熄灭，比航海黎明早三分钟，与过去六年的每个清晨分毫不差。\n\n陈玛拉站在灯室栏杆旁，看着海雾一条条散去。海面是旧锡的颜色。她用手写下时间、能见度、气压——比昨天低21毫巴，还在下降——记在那本手写航海日志里。卫星上行链路只用于紧急情况。' },
      { title: '风暴来临', summary: '午后的天空变得阴沉险恶；玛拉封好灯塔，准备熬过这场暴风雨——短波无线电突然响起。', notes: '节奏转变：从静止到紧迫。信号对玛拉来说感觉极度不对劲——不只是意外的噪音，而是打破了她安全世界物理规律的某种东西。', content: '' },
      { title: '她亲手设计的密码', summary: '玛拉破译了信号的足够部分，确认了她最担心的事：它使用的是旧小组的专属密码，而且这是一条求救信号。', notes: '展现她的职业本能在情感反应之前启动。她几乎是自动地破解了密码，然后在理解自己破解了什么时骤然僵住。', content: '' },
      // CH 2
      { title: '被驳回', summary: '海岸警卫队值班官员拒绝出动；玛拉做出了一个连她自己都感到意外的决定。', notes: '保持海岸警卫队的通话简短而官僚气十足——这正是令人抓狂之处。玛拉无论如何都要去的决定，应该感觉是必然的，而非英雄主义。', content: '' },
      { title: '礁石区', summary: '玛拉在暴风雨中划船，找到了半沉的船壳；救出列维远比她预想的艰难和危险。', notes: '动作场面。保持焦点紧绷：风、水、另一个人的重量。这里没有内心独白的空间——纯粹的求生。', content: '' },
      { title: '纹身', summary: '回到灯塔后，玛拉注意到列维手腕上的纹身——旧小组的徽标——她救人后的宽慰骤然变成某种更冰冷的东西。', notes: '章节末的反转。一个意象胜过数页铺垫。玛拉没有说出任何话——让她的沉默来承载一切。', content: '' },
      // CH 3
      { title: '健二的儿子', summary: '列维正式介绍自己；玛拉必须决定是把他赶走还是听他说完。', notes: '列维视角的第一个场景。他紧张但坚定。他已经在脑子里排练过这段对话一百次，而现实与预想截然不同。', content: '' },
      { title: '加密的信', summary: '列维将已故搭档的最后一封信的密钥交给玛拉；她读了开头几行，不得不走出房间。', notes: '第二幕的情感核心。信中的声音应该清晰地属于健二——温暖、精准、略带幽默——尽管我们从未见过他。让玛拉的反应来说明一切。', content: '' },
      { title: '有人来了', summary: '列维发现海湾中出现了一艘与任何渔船模式都不符的快艇；玛拉认出了它的轮廓。', notes: '转向外部威胁。用行动而非情感结束这一章——外部危险的到来，是从更难以面对的内部危险中得到的解脱。', content: '' },
      // CH 4
      { title: '两个小时', summary: '玛拉说明形势和计划；列维意识到她在请求他帮助构建什么。', notes: '策划场景。应该像惊悚小说的程序推进——具体、技术性、有推进力——同时也是关于两个人在压力下选择互相信任。', content: '' },
      { title: '密钥', summary: '解锁档案需要使用健二发送的最后一把密钥——这意味着玛拉必须读完那封信。她做到了。', notes: '情感高潮与惊悚高潮交织在一起。不要急促。解锁档案几乎是次要的——重要的是信上写了什么，玛拉理解了什么。', content: '' },
      { title: '广播', summary: '玛拉在特工破门前数秒发出广播；海岸警卫队的巡逻艇绕过海岬赶来。', notes: '与时间赛跑的高潮兑现。句子应短促有力。情感重量落在玛拉按下发送的那一刻。', content: '' },
      // CH 5
      { title: '信的其余部分', summary: '威胁解除后，玛拉终于读完了健二信的最后部分——得知了那个夜晚真正发生了什么。', notes: '暴风雨后的平静。这是整个故事一直在构建的场景。让它呼吸。没有行动，没有紧迫感——只有玛拉和那张纸。', content: '' },
      { title: '春日开幕', summary: '数月后，玛拉和列维为灯塔的首批公众参观者做准备；玛拉第一次当着观众的面打开灯光。', notes: '尾声场景。简洁、温暖、以意象为主。灯光在见证者面前转动，是一切的视觉隐喻——玛拉不再躲藏。', content: '她没料到自己会感到紧张。\n\n三十七个人站在灯室下方的走廊上。有人是乘季节性渡轮来观赏海鹦鹉的鸟类爱好者。有人来自海事遗产协会。三人是记者。还有一个是列维，站在后排，双手插进口袋，假装自己没在看她。\n\n玛拉看了看菲涅耳透镜——原装的，在四个月的修复工作后重新安置到位——然后看向开关。\n\n她拨动了它。\n\n灯光开始旋转。' },
    ],
    ideas: [
      { type: 'plot',      title: '内鬼的身份',        body: '破坏原始任务的内鬼应该是一个有名有姓的角色——考虑让他成为玛拉在职业上信任、但从来都不喜欢的人。揭露可以发生在画面之外（在泄露的档案中），这样就不需要反派视角的章节。' },
      { type: 'character', title: '玛拉与例行仪式的关系', body: '她每日的日志记录是一种应对机制，不只是工作职责。她用手写，因为电子记录太容易删除。她所有不愿意说出口的话，都写进了那些页面。考虑日志记录是否成为叙事框架，还是对读者保持不可见。' },
      { type: 'scene',     title: '先写出健二的信全文', body: '在写第3至4章之前先写出健二信的全文，这样他的声音在玛拉两次阅读之间就能保持一致。第一次阅读（第3章）只展示开头——足以伤人。第二次阅读（第4章）读完它。现在就写好整封信，这样你之后就能知道该怎么删减。' },
      { type: 'world',     title: '小岛与灯塔的地理', body: '小岛应该小到两个角色无法回避彼此——一条路，一栋建筑。玛拉停放小艇的海湾从灯室走廊上清晰可见，这就是列维发现来船的方式。灯室在一切之上；设在那里的场景感觉暴露而富有象征意义。' },
    ],
  },

  // ── Spanish ────────────────────────────────────────────────────────────────
  es: {
    story: {
      oneSentence: 'Una solitaria guardiana de faro y ex criptoanalista debe descifrar un código de hace diez años para salvar a un desconocido—y perdonarse a sí misma por fin.',
      setup:
        'Mara Chen, 42 años, vive sola en un faro desactivado en una isla envuelta en niebla, manteniendo la luz como contratista privada. Hace una década era criptoanalista de una unidad de inteligencia; una operación fallida causó la muerte de su compañero y desde entonces no ha abandonado la isla. El mundo exterior es demasiado ruidoso, demasiado peligroso.\n\nUna noche, una violenta tormenta otoñal llega a la isla y Mara intercepta una débil señal de radio. La transmisión es confusa, pero el patrón del cifrado es inconfundible: el mismo código exclusivo que usaba su antigua unidad, un sistema que ella misma ayudó a diseñar. Nadie vivo debería seguir usándolo—ni siquiera saber que existe.',
      disaster1:
        'Mara descifra la señal. Es una llamada de socorro con coordenadas GPS a medio kilómetro de los arrecifes—un barco se está hundiendo. Llama a la guardia costera, pero el oficial de guardia la descarta: ningún navío está registrado en esa zona, el radar no muestra nada. Mara sabe que las coordenadas son reales.\n\nSaca su vieja lancha de fibra de vidrio y rema sola hacia la tormenta. El mar intenta matarla tres veces antes de que encuentre el casco semisumergido. Saca al hombre semiconsciente del agua. Al girar hacia casa ve un tatuaje en su muñeca—el emblema del faro que su unidad usaba como símbolo de equipo—y se le hiela la sangre.',
      disaster2:
        'De vuelta en el faro, Mara atiende al joven, Levi, 24 años, y descubre quién es: el hijo de su compañero muerto, Kenji Nakamura. Levi lleva dos años rastreándola. No está aquí por accidente.\n\nLe entrega la clave de un mensaje cifrado que Kenji le dejó a ella. Leer tan solo las primeras líneas obliga a Mara a revivir la operación con todo detalle. Quiere que Levi se vaya y que la carta arda. Pero él también trae otra noticia: alguien de la antigua red los está buscando a los dos, y sus intenciones no son amistosas.',
      disaster3:
        'Una lancha rápida aparece en la cala: dos operativos de una banda criminal que adquirió los activos de la unidad de inteligencia tras su disolución. Creen que Mara aún posee el archivo de claves maestras del antiguo sistema de cifrado—claves que podrían exponer quince años de comunicaciones interceptadas.\n\nMara tiene dos horas y ningún arma. Ella y Levi improvisan un emisor de radio con el equipo del faro. Su único plan: transmitir el archivo a cada servidor de noticias y bandeja de entrada gubernamental que Mara memorizó antes de retirarse al mundo. Pero para desbloquearlo necesita la última clave que Kenji le envió—lo que significa que tendrá que terminar de leer su carta.',
      ending:
        'La transmisión sale al aire segundos antes de que los operativos irrumpan en la sala de la linterna. Con el archivo ya público y un buque de la guardia costera doblando el promontorio, los operativos se retiran.\n\nEl mensaje de Kenji, leído hasta el final, dice que nunca la culpó: sabía que la operación estaba comprometida desde dentro y había intentado advertirla. Su muerte no fue culpa de Mara. Ella carga con esa verdad durante todo el invierno. En primavera abre el faro a los visitantes como museo marítimo en funcionamiento. Levi la ayuda a restaurar la lente de Fresnel original. La luz sigue girando cada noche, pero ahora otras personas también pueden verla.',
    },
    mara: {
      name: 'Mara Chen',
      oneSentence: 'Una brillante criptoanalista autoexiliada que ha cambiado la conexión humana por la certeza inmutable del haz de un faro.',
      goal: 'Mantener al mundo a distancia y evitar revivir la misión que mató a su compañero.',
      motivation: 'Mara carga con una culpa aplastante: cree que su lectura equivocada de la inteligencia causó la muerte de Kenji. El aislamiento es su penitencia y su protección—si no le importa nada, no puede volver a perder nada.',
      conflict: 'La señal cifrada la arrastra de regreso al mundo del que huyó, y la presencia de Levi hace imposible la neutralidad. Cada paso que da para ayudarle la obliga a enfrentarse a la historia que se ha contado sobre el pasado.',
      epiphany: 'Mara finalmente lee el último mensaje de Kenji y descubre la verdad: la operación fue saboteada desde dentro, y Kenji lo sabía y la perdonó. Su culpa se construyó sobre una mentira. Puede dejar de castigarse a sí misma y empezar a vivir.',
    },
    levi: {
      name: 'Levi Nakamura',
      oneSentence: 'Un joven ingeniero impulsado por el amor a su padre y la necesidad de entender la verdad de su muerte—aunque la verdad sea más dura que la historia.',
      goal: 'Entregar el último mensaje de su padre a Mara y averiguar qué pasó realmente la noche en que murió Kenji.',
      motivation: 'Levi idolatraba a su padre y lleva años sospechando del relato oficial. No está enfadado con Mara—quiere respuestas, y presiente que ella es la única persona lo bastante honesta para dárselas.',
      conflict: 'Levi llega creyendo que está preparado para escuchar la verdad, pero la verdad real—que su padre se sacrificó voluntariamente en una situación sin buenas opciones—es más dolorosa que culpar a alguien.',
      epiphany: 'El mensaje de su padre no trataba de culpa ni de absolución, sino de amor. Kenji quería que Levi creciera libre de rencor. La larga búsqueda termina no con justicia, sino con paz.',
    },
    chapters: [
      {
        title: 'El faro al fin del mundo',
        summary: 'Conocemos a Mara en su isla, instalada en su rutina solitaria, y sentimos el peso de aquello de lo que huye. Llega la tormenta y aparece la extraña señal.',
      },
      {
        title: 'Adentrarse en la tormenta',
        summary: 'Mara desafía a la guardia costera y rema hasta el naufragio. Rescata a Levi y reconoce el tatuaje en su muñeca—la primera grieta en su armadura.',
      },
      {
        title: 'El hijo de Kenji',
        summary: 'Levi revela quién es y por qué ha venido. Mara lee parte del mensaje cifrado y queda abrumada por el duelo y la culpa. Intenta alejar a Levi—y se entera de que ambos están en peligro.',
      },
      {
        title: 'El archivo',
        summary: 'Llega el sindicato criminal. Mara y Levi luchan contra el reloj para desbloquear el archivo maestro y transmitirlo antes de que los operativos alcancen la sala de la linterna.',
      },
      {
        title: 'La luz gira',
        summary: 'La transmisión tiene éxito. Mara lee el resto del mensaje de Kenji—y finalmente comprende. Meses después abre el faro al mundo.',
      },
    ],
    scenes: [
      // CH 1
      { title: 'Rutina matutina', summary: 'Mara cumple su ritual al amanecer—revisar la luz, anotar el tiempo, no hablar con nadie—mientras descubrimos el perfil de su autoexilio.', notes: 'Establecer el tono: austero, preciso, levemente melancólico. Usar detalles sensoriales—sal, niebla, el clic mecánico del reloj del faro—para mostrar un mundo que Mara controla por completo. Evitar explicar el pasado directamente; dejar que las acciones hablen.', content: 'La luz se apagó a las 05:47, tres minutos antes del alba náutica, exactamente igual que cada mañana durante seis años.\n\nMara Chen se quedó de pie en la barandilla de la sala de la linterna y observó cómo la niebla se disipaba en finas franjas. Abajo, el mar tenía el color del peltre viejo. Anotó la hora, la visibilidad y la presión barométrica—21 milibares menos que ayer, todavía descendiendo—en el diario de a bordo que llevaba a mano, porque el enlace satelital era solo para emergencias.' },
      { title: 'La tormenta se acerca', summary: 'El cielo de la tarde se vuelve amenazante; Mara asegura el faro y se prepara para capear el temporal—hasta que su radio de onda corta cobra vida.', notes: 'Cambio de ritmo: de la quietud a la urgencia. La señal debe resultarle profundamente extraña a Mara—no es solo ruido inesperado, sino algo que viola las leyes físicas de su mundo seguro.', content: '' },
      { title: 'Un cifrado que ella diseñó', summary: 'Mara descifra suficiente de la señal para confirmar lo que temía: usa el código exclusivo de su antigua unidad, y es una llamada de socorro.', notes: 'Mostrar su instinto profesional activándose antes de que las emociones la alcancen. Descifra el código casi automáticamente y luego se queda paralizada al comprender lo que ha descifrado.', content: '' },
      // CH 2
      { title: 'Rechazada', summary: 'El oficial de la guardia costera se niega a actuar; Mara toma una decisión que la sorprende incluso a ella.', notes: 'Mantener la llamada a la guardia costera breve y burocrática—eso es lo que resulta exasperante. La decisión de Mara de ir de todos modos debe sentirse inevitable, no heroica.', content: '' },
      { title: 'Los arrecifes', summary: 'Mara rema en medio de la tormenta y encuentra el casco semisumergido; rescatar a Levi es más difícil y peligroso de lo que esperaba.', notes: 'Escena de acción. Mantener el foco apretado: viento, agua, el peso de otra persona. No hay espacio para la interioridad—pura supervivencia.', content: '' },
      { title: 'El tatuaje', summary: 'De vuelta en el faro, Mara ve el tatuaje en la muñeca de Levi—el emblema de la antigua unidad—y el alivio de haberle rescatado se convierte en algo mucho más frío.', notes: 'Giro al final del capítulo. Una sola imagen hace el trabajo de páginas de exposición. Mara no dice nada en voz alta—dejar que su silencio lo transmita todo.', content: '' },
      // CH 3
      { title: 'El hijo de Kenji', summary: 'Levi se presenta formalmente; Mara debe decidir si echarlo o escucharle.', notes: 'Primera escena desde el punto de vista de Levi. Está nervioso pero decidido. Ha ensayado esta conversación cien veces y no se parece en nada a lo que imaginó.', content: '' },
      { title: 'La carta cifrada', summary: 'Levi le da a Mara la clave del último mensaje de su compañero muerto; ella lee la primera parte y tiene que salir de la habitación.', notes: 'Núcleo emocional del segundo acto. La carta debe estar escrita en una voz claramente propia de Kenji—cálida, precisa, con ligero humor—aunque nunca le hayamos conocido. Dejar que la reacción de Mara lo cuente todo.', content: '' },
      { title: 'Alguien viene', summary: 'Levi avista una lancha rápida que no encaja con ningún patrón pesquero; Mara reconoce la silueta.', notes: 'Transición a la amenaza exterior. Terminar el capítulo con acción, no con emoción—el peligro que llega desde fuera es un alivio respecto al peligro interior más difícil de afrontar.', content: '' },
      // CH 4
      { title: 'Dos horas', summary: 'Mara expone la situación y el plan; Levi comprende lo que le está pidiendo que ayude a construir.', notes: 'Escena de planificación. Debe sentirse como un procedimiento de thriller—específico, técnico, con impulso—mientras también habla de dos personas que deciden confiar la una en la otra bajo presión.', content: '' },
      { title: 'La clave', summary: 'Para desbloquear el archivo, Mara debe usar la clave que Kenji le envió—lo que significa que tiene que terminar de leer su carta. Lo hace.', notes: 'El clímax emocional entretejido con el clímax del thriller. No precipitarlo. Desbloquear el archivo es casi lo de menos—lo que importa es lo que dice la carta y lo que Mara comprende.', content: '' },
      { title: 'Transmisión', summary: 'Mara transmite el archivo segundos antes de que los operativos irrumpan en la sala de la linterna; el buque de la guardia costera dobla el promontorio.', notes: 'La recompensa de la carrera contrarreloj. Frases cortas y contundentes. El peso emocional recae en el momento en que Mara pulsa enviar.', content: '' },
      // CH 5
      { title: 'El resto de la carta', summary: 'Con la amenaza resuelta, Mara lee por fin el mensaje de Kenji hasta el final—y descubre lo que realmente ocurrió aquella noche.', notes: 'Calma tras la tormenta. Es la escena que toda la historia ha estado construyendo. Dejar que respire. Sin acción, sin urgencia—solo Mara y la página.', content: '' },
      { title: 'Apertura de primavera', summary: 'Meses después, Mara y Levi preparan el faro para sus primeros visitantes; Mara enciende la luz ante el público por primera vez.', notes: 'Escena de epílogo. Pequeña, cálida, guiada por imágenes. La luz girando ante testigos es la metáfora visual de todo—Mara ya no se esconde.', content: 'No esperaba sentir nervios.\n\nTreinta y siete personas se encontraban en la galería bajo la sala de la linterna. Algunas eran observadores de aves que habían tomado el ferry de temporada por los frailecillos. Otras eran del patrimonio marítimo. Tres eran periodistas. Una era Levi, de pie al fondo, con las manos en los bolsillos, fingiendo que no la miraba.\n\nMara observó la lente de Fresnel—la original, reinstalada tras cuatro meses de trabajo de restauración—y luego el interruptor.\n\nLo accionó.\n\nLa luz comenzó a girar.' },
    ],
    ideas: [
      { type: 'plot',      title: 'La identidad del saboteador',     body: 'El infiltrado que comprometió la operación original debería ser un personaje con nombre—considera hacer que sea alguien en quien Mara confiaba profesionalmente pero que nunca le cayó bien. La revelación puede ocurrir fuera de la pantalla (en el archivo filtrado) para no necesitar un capítulo desde el punto de vista del villano.' },
      { type: 'character', title: 'La relación de Mara con la rutina', body: 'Sus entradas diarias en el diario son un mecanismo de afrontamiento, no solo una obligación laboral. Las escribe a mano porque un registro mecanografiado sería demasiado fácil de borrar. Todo lo que se niega a decir en voz alta va a esas páginas. Considera si las entradas del diario se convierten en un recurso narrativo o permanecen invisibles para el lector.' },
      { type: 'scene',     title: 'Escribir primero la carta de Kenji completa', body: 'Redacta la carta de Kenji entera antes de escribir los capítulos 3 y 4, para que su voz sea coherente en ambas lecturas. La primera lectura (Cap. 3) muestra solo el comienzo—suficiente para herir a Mara. La segunda (Cap. 4) la completa. Escríbela ahora para poder cortarla correctamente después.' },
      { type: 'world',     title: 'Geografía de la isla y el faro',  body: 'La isla debe ser lo bastante pequeña para que dos personajes no puedan evitarse—un camino, un edificio. La cala donde Mara guarda la lancha es visible desde la galería de la sala de la linterna, y así es como Levi avista el bote que se acerca. La sala de la linterna está por encima de todo; las escenas situadas allí se sienten expuestas y simbólicas.' },
    ],
  },

  // ── French ─────────────────────────────────────────────────────────────────
  fr: {
    story: {
      oneSentence: 'Une gardienne de phare recluse et ancienne cryptanalyste doit déchiffrer un code vieux de dix ans pour sauver un inconnu—et se pardonner enfin.',
      setup:
        'Mara Chen, 42 ans, vit seule dans un phare désaffecté sur une île enveloppée de brume, entretenant la lumière en tant que prestataire privée. Il y a dix ans, elle était cryptanalyste pour une unité de renseignement gouvernementale ; une opération ratée a coûté la vie à son partenaire et elle n\'a pas quitté l\'île depuis. Le monde extérieur est trop bruyant, trop dangereux.\n\nUne nuit, une violente tempête d\'automne s\'abat sur l\'île et Mara intercepte un faible signal radio. La transmission est brouillée, mais le schéma du chiffrement est indéniable : le même code exclusif qu\'utilisait son ancienne unité, un système qu\'elle a elle-même contribué à concevoir. Personne en vie ne devrait encore l\'utiliser—ni même savoir qu\'il existe.',
      disaster1:
        'Mara déchiffre le signal. C\'est un appel de détresse avec des coordonnées GPS à un demi-kilomètre des récifs—un bateau est en train de couler. Elle contacte les gardes-côtes, mais l\'officier de permanence la rejette : aucun navire n\'est enregistré dans cette zone, le radar ne montre rien. Mara sait que les coordonnées sont réelles.\n\nElle traîne son vieux skiff en fibre de verre dans l\'eau et rame seule dans la tempête. La mer tente de la tuer trois fois avant qu\'elle trouve la coque à moitié submergée. Elle extrait l\'homme à peine conscient. En se retournant vers le phare elle aperçoit un tatouage sur son poignet—l\'emblème du phare que son unité utilisait comme symbole d\'équipe—et son sang se glace.',
      disaster2:
        'De retour au phare, Mara réchauffe le jeune homme, Levi, 24 ans, et découvre qui il est : le fils de son partenaire décédé, Kenji Nakamura. Levi a passé deux ans à la traquer. Il n\'est pas là par hasard.\n\nIl lui remet la clé d\'un message chiffré que Kenji lui avait destiné. Lire même les premières lignes force Mara à revivre l\'opération en détail. Elle veut que Levi parte et que la lettre brûle. Mais il apporte aussi une autre nouvelle : quelqu\'un de l\'ancien réseau les recherche tous les deux, et ses intentions ne sont pas amicales.',
      disaster3:
        'Un canot pneumatique rapide apparaît dans la crique : deux agents d\'un syndicat criminel qui a acquis les actifs de l\'unité de renseignement après sa dissolution. Ils croient que Mara détient encore l\'archive des clés maîtresses de l\'ancien système de chiffrement—des clés qui pourraient exposer quinze ans de communications interceptées.\n\nMara dispose de deux heures et d\'aucune arme. Elle et Levi bricolent un émetteur radio avec l\'équipement du phare. Leur unique plan : diffuser l\'archive à chaque serveur de presse et boîte mail gouvernementale que Mara a mémorisés. Mais pour la déverrouiller, elle doit utiliser la dernière clé que Kenji lui a envoyée—ce qui signifie qu\'elle doit finir de lire sa lettre.',
      ending:
        'La diffusion part quelques secondes avant que les agents ne forcent l\'entrée de la salle de la lanterne. L\'archive étant déjà publique et un patrouilleur des gardes-côtes doublant le promontoire, les agents battent en retraite.\n\nLe message de Kenji, lu jusqu\'au bout, dit qu\'il ne l\'a jamais blâmée—il savait que l\'opération avait été compromise de l\'intérieur et avait tenté de la prévenir. Sa mort n\'était pas la faute de Mara. Elle porte cette vérité tout l\'hiver. Au printemps, elle ouvre le phare aux visiteurs en tant que musée maritime en activité. Levi l\'aide à restaurer la lentille de Fresnel d\'origine. La lumière tourne encore chaque nuit, mais désormais d\'autres personnes peuvent la voir aussi.',
    },
    mara: {
      name: 'Mara Chen',
      oneSentence: 'Une cryptanalyste brillante et auto-exilée qui a troqué la connexion humaine contre la certitude immuable d\'un faisceau de phare.',
      goal: 'Tenir le monde à distance et éviter de revivre la mission qui a tué son partenaire.',
      motivation: 'Mara porte une culpabilité écrasante : elle croit que sa lecture erronée du renseignement a causé la mort de Kenji. L\'isolement est sa pénitence et sa protection—si rien ne lui importe, elle ne peut plus rien perdre.',
      conflict: 'Le signal chiffré la ramène dans le monde qu\'elle a fui, et la présence de Levi rend la neutralité impossible. Chaque pas qu\'elle fait pour l\'aider l\'oblige à affronter l\'histoire qu\'elle s\'est racontée sur le passé.',
      epiphany: 'Mara lit enfin le dernier message de Kenji et découvre la vérité : l\'opération a été sabotée de l\'intérieur, et Kenji le savait et lui avait pardonné. Sa culpabilité reposait sur un mensonge. Elle peut cesser de se punir et recommencer à vivre.',
    },
    levi: {
      name: 'Levi Nakamura',
      oneSentence: 'Un jeune ingénieur poussé par l\'amour pour son père et le besoin de comprendre la vérité de sa mort—même si la vérité est plus douloureuse que l\'histoire.',
      goal: 'Remettre le dernier message de son père à Mara et découvrir ce qui s\'est vraiment passé la nuit où Kenji est mort.',
      motivation: 'Levi idolâtrait son père et soupçonne depuis des années que le récit officiel est faux. Il n\'est pas en colère contre Mara—il veut des réponses, et il pressent qu\'elle est la seule assez honnête pour les lui donner.',
      conflict: 'Levi arrive en croyant être prêt à entendre la vérité, mais la vraie vérité—que son père s\'est sacrifié volontairement dans une situation sans bonne issue—est plus douloureuse que d\'accuser quelqu\'un.',
      epiphany: 'Le message de son père ne parlait pas de culpabilité ou d\'absolution, mais d\'amour. Kenji voulait que Levi grandisse sans rancœur. La longue quête se termine non pas par la justice, mais par la paix.',
    },
    chapters: [
      {
        title: 'Le phare au bout du monde',
        summary: 'Nous rencontrons Mara sur son île, installée dans sa routine solitaire, et ressentons le poids de ce dont elle se cache. La tempête commence et l\'étrange signal arrive.',
      },
      {
        title: 'Dans la tempête',
        summary: 'Mara défie les gardes-côtes et rame jusqu\'à l\'épave. Elle secourt Levi et reconnaît le tatouage sur son poignet—la première fissure dans son armure.',
      },
      {
        title: 'Le fils de Kenji',
        summary: 'Levi révèle qui il est et pourquoi il est venu. Mara lit une partie du message chiffré et est submergée par le deuil et la culpabilité. Elle tente de repousser Levi—et apprend qu\'ils sont tous les deux en danger.',
      },
      {
        title: 'L\'archive',
        summary: 'Le syndicat arrive. Mara et Levi luttent contre la montre pour déverrouiller l\'archive principale et la diffuser avant que les agents n\'atteignent la salle de la lanterne.',
      },
      {
        title: 'La lumière tourne',
        summary: 'La diffusion réussit. Mara lit la suite du message de Kenji—et comprend enfin. Des mois plus tard, elle ouvre le phare au monde.',
      },
    ],
    scenes: [
      // CH 1
      { title: 'Routine matinale', summary: 'Mara accomplit son rituel à l\'aube—vérifier la lumière, noter la météo, ne parler à personne—pendant que nous découvrons le profil de son auto-exil.', notes: 'Établir le ton : sobre, précis, légèrement mélancolique. Utiliser des détails sensoriels—sel, brume, le cliquetis mécanique de l\'horloge du phare—pour montrer un monde que Mara contrôle entièrement. Éviter les expositions directes du passé ; laisser les actions parler.', content: 'La lumière s\'éteignit à 05h47, trois minutes avant l\'aube nautique, exactement comme chaque matin depuis six ans.\n\nMara Chen se tenait à la rambarde de la salle de la lanterne et regardait la brume se dissiper en fines bandes. En bas, la mer avait la couleur du vieux étain. Elle nota l\'heure, la visibilité, la pression atmosphérique—21 millibars de moins qu\'hier, encore en baisse—dans le journal de bord qu\'elle tenait à la main, car la liaison satellite n\'était réservée qu\'aux urgences.' },
      { title: 'La tempête arrive', summary: 'Le ciel de l\'après-midi devient menaçant ; Mara sécurise le phare et se prépare à affronter la tempête—puis sa radio à ondes courtes s\'anime.', notes: 'Changement de rythme : de l\'immobilité à l\'urgence. Le signal doit paraître profondément étrange à Mara—pas seulement un bruit inattendu, mais quelque chose qui viole les lois physiques de son monde sûr.', content: '' },
      { title: 'Un chiffrement qu\'elle a conçu', summary: 'Mara déchiffre assez du signal pour confirmer ce qu\'elle craignait : il utilise le code exclusif de son ancienne unité, et c\'est un appel de détresse.', notes: 'Montrer son instinct professionnel qui s\'active avant que ses émotions ne la rattrapent. Elle déchiffre le code presque automatiquement, puis se fige quand elle comprend ce qu\'elle a déchiffré.', content: '' },
      // CH 2
      { title: 'Refusée', summary: 'L\'officier des gardes-côtes refuse d\'agir ; Mara prend une décision qui la surprend elle-même.', notes: 'Garder l\'appel aux gardes-côtes bref et bureaucratique—c\'est ce qui le rend exaspérant. La décision de Mara d\'y aller quand même doit sembler inévitable, pas héroïque.', content: '' },
      { title: 'Les récifs', summary: 'Mara rame dans la tempête et trouve la coque à moitié submergée ; secourir Levi est plus difficile et dangereux qu\'elle ne l\'anticipait.', notes: 'Scène d\'action. Maintenir le focus serré : vent, eau, le poids d\'une autre personne. Pas de place pour l\'intériorité ici—pure survie.', content: '' },
      { title: 'Le tatouage', summary: 'De retour au phare, Mara remarque le tatouage au poignet de Levi—l\'emblème de l\'ancienne unité—et son soulagement de l\'avoir secouru se transforme en quelque chose de bien plus froid.', notes: 'Retournement de fin de chapitre. Une seule image fait le travail de pages d\'exposition. Mara ne dit rien à voix haute—laisser son silence tout porter.', content: '' },
      // CH 3
      { title: 'Le fils de Kenji', summary: 'Levi se présente formellement ; Mara doit décider de le mettre à la porte ou de l\'écouter.', notes: 'Première scène du point de vue de Levi. Il est nerveux mais déterminé. Il a répété cette conversation cent fois et elle ne ressemble en rien à ce qu\'il avait imaginé.', content: '' },
      { title: 'La lettre chiffrée', summary: 'Levi remet à Mara la clé du dernier message de son partenaire décédé ; elle lit la première partie et doit quitter la pièce.', notes: 'Noyau émotionnel du deuxième acte. La lettre doit être rédigée dans une voix clairement celle de Kenji—chaleureuse, précise, légèrement ironique—même si nous ne l\'avons jamais rencontré. Laisser la réaction de Mara tout raconter.', content: '' },
      { title: 'Quelqu\'un arrive', summary: 'Levi aperçoit un canot rapide qui ne correspond à aucun schéma de pêche ; Mara reconnaît la silhouette.', notes: 'Transition vers la menace extérieure. Terminer le chapitre sur l\'action, pas sur l\'émotion—le danger qui arrive de l\'extérieur est un soulagement face au danger intérieur plus difficile à affronter.', content: '' },
      // CH 4
      { title: 'Deux heures', summary: 'Mara expose la situation et le plan ; Levi réalise ce qu\'elle lui demande d\'aider à construire.', notes: 'Scène de planification. Doit avoir la tension d\'un procédé de thriller—spécifique, technique, propulsif—tout en montrant deux personnes qui choisissent de se faire confiance sous pression.', content: '' },
      { title: 'La clé', summary: 'Pour déverrouiller l\'archive, Mara doit utiliser la clé que Kenji lui a envoyée—ce qui signifie qu\'elle doit finir de lire sa lettre. Elle le fait.', notes: 'Le climax émotionnel tissé dans le climax du thriller. Ne pas se précipiter. Déverrouiller l\'archive est presque secondaire—ce qui compte, c\'est ce que dit la lettre et ce que Mara comprend.', content: '' },
      { title: 'Diffusion', summary: 'Mara transmet l\'archive quelques secondes avant que les agents ne forcent la salle de la lanterne ; le patrouilleur des gardes-côtes double le promontoire.', notes: 'La récompense de la course contre la montre. Phrases courtes et percutantes. Le poids émotionnel repose sur le moment où Mara appuie sur envoyer.', content: '' },
      // CH 5
      { title: 'Le reste de la lettre', summary: 'La menace écartée, Mara lit enfin le message de Kenji jusqu\'au bout—et découvre ce qui s\'est vraiment passé cette nuit-là.', notes: 'Calme après la tempête. C\'est la scène que toute l\'histoire a construite. Laisser respirer. Pas d\'action, pas d\'urgence—juste Mara et la page.', content: '' },
      { title: 'Ouverture de printemps', summary: 'Des mois plus tard, Mara et Levi préparent le phare pour ses premiers visiteurs ; Mara allume la lumière devant un public pour la première fois.', notes: 'Scène d\'épilogue. Petite, chaleureuse, portée par les images. La lumière qui tourne devant des témoins est la métaphore visuelle de tout—Mara ne se cache plus.', content: 'Elle ne s\'attendait pas à se sentir nerveuse.\n\nTrente-sept personnes se tenaient sur la galerie sous la salle de la lanterne. Certaines étaient des ornithologues venus par le ferry saisonnier pour les macareux. D\'autres venaient de la société du patrimoine maritime. Trois étaient journalistes. L\'une était Levi, debout au fond, les mains dans les poches, faisant semblant de ne pas la regarder.\n\nMara regarda la lentille de Fresnel—l\'originale, repositionnée après quatre mois de travail de restauration—puis l\'interrupteur.\n\nElle l\'activa.\n\nLa lumière se mit à tourner.' },
    ],
    ideas: [
      { type: 'plot',      title: 'L\'identité du saboteur',            body: 'L\'infiltré qui a compromis la mission originale devrait être un personnage nommé—envisagez d\'en faire quelqu\'un en qui Mara avait confiance professionnellement mais qu\'elle n\'a jamais aimé. La révélation peut se produire hors champ (dans l\'archive divulguée) pour éviter d\'avoir besoin d\'un chapitre du point de vue du méchant.' },
      { type: 'character', title: 'La relation de Mara avec la routine', body: 'Ses entrées quotidiennes dans le journal sont un mécanisme d\'adaptation, pas seulement un devoir professionnel. Elle les écrit à la main parce qu\'un enregistrement tapé serait trop facile à effacer. Tout ce qu\'elle refuse de dire à voix haute va dans ces pages. Réfléchissez à si les entrées du journal deviennent un dispositif narratif ou restent invisibles pour le lecteur.' },
      { type: 'scene',     title: 'Écrire d\'abord la lettre de Kenji complète', body: 'Rédigez la lettre de Kenji en entier avant d\'écrire les chapitres 3 et 4, pour que sa voix soit cohérente à travers les deux lectures. La première lecture (Ch. 3) ne montre que le début—assez pour blesser Mara. La seconde (Ch. 4) la complète. Écrivez la lettre entière maintenant pour pouvoir la couper correctement plus tard.' },
      { type: 'world',     title: 'Géographie de l\'île et du phare',   body: 'L\'île doit être assez petite pour que deux personnages ne puissent pas s\'éviter—un seul chemin, un seul bâtiment. La crique où Mara garde le skiff est visible depuis la galerie de la salle de la lanterne, ce qui explique comment Levi aperçoit le bateau qui approche. La salle de la lanterne est au-dessus de tout ; les scènes qui s\'y déroulent semblent exposées et symboliques.' },
    ],
  },
};

// ─── Structure builder ────────────────────────────────────────────────────────

const CHAPTER_IDS  = [CH_1, CH_2, CH_3, CH_4, CH_5];
const CHAPTER_BEATS = ['setup', 'disaster1', 'disaster2', 'disaster3', 'ending'];

// scenes per chapter (count must match each locale's scenes array length)
const SCENES_PER_CHAPTER = [3, 3, 3, 3, 2];

const SCENE_POV = [
  // CH 1          CH 2          CH 3          CH 4          CH 5
  CHAR_MARA, CHAR_MARA, CHAR_MARA,
  CHAR_MARA, CHAR_MARA, CHAR_MARA,
  CHAR_LEVI, CHAR_MARA, CHAR_LEVI,
  CHAR_MARA, CHAR_MARA, CHAR_LEVI,
  CHAR_MARA, CHAR_MARA,
];

export function getLocalizedExampleStory(locale = 'en') {
  const c = content[locale] || content.en;

  const story = {
    id: EXAMPLE_STORY_ID,
    ...c.story,
    updatedAt: T,
    createdAt: T,
  };

  const characters = [
    { id: CHAR_MARA, storyId: EXAMPLE_STORY_ID, ...c.mara, createdAt: T },
    { id: CHAR_LEVI, storyId: EXAMPLE_STORY_ID, ...c.levi, createdAt: T + 1 },
  ];

  const chapters = c.chapters.map((ch, i) => ({
    id: CHAPTER_IDS[i],
    storyId: EXAMPLE_STORY_ID,
    title: ch.title,
    summary: ch.summary,
    beat: CHAPTER_BEATS[i],
    order: i,
    createdAt: T + i,
  }));

  // Assign scenes to chapters based on SCENES_PER_CHAPTER counts
  let sceneIndex = 0;
  const scenes = [];
  for (let ci = 0; ci < SCENES_PER_CHAPTER.length; ci++) {
    const count = SCENES_PER_CHAPTER[ci];
    for (let si = 0; si < count; si++) {
      const sc = c.scenes[sceneIndex];
      scenes.push({
        id: `inkflow-example-sc-${ci + 1}-${si + 1}`,
        chapterId: CHAPTER_IDS[ci],
        title: sc.title,
        oneSentenceSummary: sc.summary,
        notes: sc.notes || '',
        content: sc.content || '',
        povCharacterId: SCENE_POV[sceneIndex],
        order: si,
        createdAt: T + sceneIndex,
      });
      sceneIndex++;
    }
  }

  const ideas = c.ideas.map((idea, i) => ({
    id: `inkflow-example-idea-${i + 1}`,
    storyId: EXAMPLE_STORY_ID,
    type: idea.type,
    title: idea.title,
    body: idea.body,
    createdAt: T + i,
  }));

  return { story, characters, chapters, scenes, ideas };
}
