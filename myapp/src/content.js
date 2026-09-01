// Copy for the site.
//
// The opening screen stays English: the masthead and the card labels are set
// once here and never translated, so the drifting composition does not reflow
// when the language changes. Everything a visitor reads *inside* a card
// has both languages, and they live side by side so adding a line in one and
// forgetting the other is a missing key rather than a page that quietly shows
// the wrong text.
//
// TODO markers are where the team still has to supply real text.

export const SHARED = {
  masthead: 'FETAL MOVEMENT : TEAM MONOBLOC',

  // The send button is a mark, not a word, so it reads the same in either
  // language. The words below it are still translated - they become the
  // button's accessible name, which a screen reader announces instead of
  // trying to pronounce a tick.
  submitMark: '✓',
  sendingMark: '· · ·',
};

// Identity of each card, defined once. The two translations below are indexed
// against this list, so a card cannot end up with a different number or label
// depending on which language is showing.
//
// The heading is here rather than in the translations on purpose: the card is
// called PROCESS on the drifting canvas, and translating the heading inside
// would leave the visitor looking at a panel that appears to be a different
// card from the one they tapped. Only the prose below it changes language.
export const CARD_KEYS = [
  // The drifting label stays short while the panel heading carries the full
  // name: the label is positioned below its card and never wrapped, so a long
  // one runs off the screen edge when the card drifts right.
  { id: '01', tag: 'location', title: 'Location & Caption' },
  { id: '02', tag: 'work', title: 'Work' },
  { id: '03', tag: 'process', title: 'Process' },
  { id: '04', tag: 'team', title: 'Team' },
  // lit: the only card that asks the visitor for something back, so its label
  // glows with the masthead instead of sitting quiet like the other four.
  { id: '05', tag: 'feedback', title: 'Feedback', lit: true },
];

// What actually gets stored. The labels below are translated; these are not.
//
// If the displayed text were saved instead, the same answer would land in the
// table as "살아 있는 듯함" from one visitor and "alive" from the next, and the
// two would never add up. The order here matches the order of the option labels
// in both languages, so a question cannot drift out of alignment.
export const SURVEY_KEYS = [
  { key: 'first_image', values: ['creature', 'birth', 'nature', 'machine', 'abstract', 'other'] },
  { key: 'motion', values: ['alive', 'irregular', 'tension', 'mechanical', 'none'] },
  { key: 'reactive', values: [5, 4, 3, 2, 1] },
  { key: 'meaning', values: [5, 4, 3, 2, 1] },
];

// Who did what. Names and role titles are not translated: a name is a name,
// and a Korean rendering of "Project Leader" reads as a translation of a title
// rather than as the title. The skills below it are translated, because those
// are descriptions rather than labels.
//
// [name, role, contact] - contact is optional. The skill lists are matched to
// this one by position, which is why neither is sorted anywhere.
export const TEAM = [
  ['양희상', 'Project Leader', { mail: 'alex3918@g.hongik.ac.kr', ig: 'hs.uy5' }],
  ['이소울', 'Electrical', { mail: 'viceversa2188@naver.com' }],
  ['이원준', 'Fabrication', { mail: 'C342019@naver.com', ig: '2onejun' }],
  ['전진', 'Sound & Component Design', { mail: 'gpfzpf@naver.com', ig: 'jhanstin__' }],
];

const SKILLS_EN = [
  ['Project Management', 'Programming', 'Control System', 'Interaction Design',
   'Sensor Integration'],
  ['Circuit Design', 'Power System', 'Wiring', 'Electronics',
   'System Integration'],
  ['Fabrication', 'Welding', 'Metalwork', 'Structural Design', 'Assembly'],
  ['Sound Design', 'Component Design', 'Spatial Sound', 'Sketch'],
];

const SKILLS_KO = [
  ['프로젝트 총괄', '프로그래밍', '제어 시스템', '인터랙션 디자인', '센서 연동'],
  ['회로 설계', '전원 시스템', '배선', '전자 부품', '시스템 통합'],
  ['제작', '용접', '금속 가공', '구조 설계', '조립'],
  ['사운드 디자인', '부품 디자인', '공간 음향', '스케치'],
];

// The making, in order. The one-word key is the same in either language - it is
// a stage name, not prose - so it lives here once and the numbering comes from
// position, the same arrangement as TEAM. The two lists below hold only the
// title and the sentence, matched to this one by position.
export const STEP_KEYS = ['FORM', 'CIRCUIT', 'ASSEMBLY', 'FRAME', 'INTEGRATION', 'SKIN'];

const STEPS_EN = [
  ['Designing the exterior',
   'Set the overall size and shape of the piece, and where the five protrusions sit and how they move.'],
  ['Internal circuit design',
   'Laid the circuit out around the flow of power and signal, so that the sensor, the actuators, the lighting and the control all run together.'],
  ['Building the circuit',
   'Built the design out of real parts, wiring and soldering each device into place.'],
  ['Structural fabrication',
   'Fabricated and welded a metal frame able to carry both the shape of the piece and the devices inside it.'],
  ['System integration',
   'Placed the circuitry and the actuators inside the finished frame, and joined sensing, movement and light into a single system.'],
  ['Making the skin',
   'Wrapped the structure in stocking fabric and sewed it by hand, giving a surface that stretches and draws back as the piece moves.'],
];

const STEPS_KO = [
  ['외형 설계',
   '작품의 전체적인 크기와 형태, 다섯 개 돌출부의 위치와 움직임을 설계했습니다.'],
  ['내부 회로 설계',
   '센서, 액추에이터, 조명과 제어부가 함께 작동하도록 전원과 신호 흐름을 중심으로 회로를 구성했습니다.'],
  ['회로 구현',
   '설계한 회로를 실제 부품으로 구현하고, 배선과 납땜을 통해 각 장치를 연결했습니다.'],
  ['구조물 제작',
   '작품의 형태와 내부 장치를 지지할 수 있도록 금속 프레임을 제작하고 용접해 골격을 완성했습니다.'],
  ['시스템 결합',
   '완성된 프레임 내부에 회로와 액추에이터를 배치하고, 센서 · 움직임 · 조명이 하나의 시스템으로 작동하도록 결합했습니다.'],
  ['외피 제작',
   '구조물 위에 스타킹 소재를 감싸고 직접 바느질해 움직임에 따라 자연스럽게 늘어나고 수축하는 표면을 완성했습니다.'],
];

const COLOPHON_EN = [
  ['MOTION', '5 linear actuators'],
  ['SENSING', 'ultrasonic, wireless'],
  ['LIGHT', '4 channels'],
  ['SOUND', '4 tracks'],
];

const COLOPHON_KO = [
  ['구동', '리니어 액추에이터 5축'],
  ['감지', '초음파 · 무선 연동'],
  ['조명', '4채널'],
  ['소리', '4트랙'],
];

export const CONTENT = {
  en: {
    other: 'KOR',
    close: 'CLOSE',

    zoneWord: 'ZONE',
    drag: 'drag closer',


    survey: {
      // Five questions is already at the limit for something opened on a phone
      // days after the show; the last one is optional so it never blocks the
      // send.
      questions: [
        {
          label: 'FIRST IMAGE',
          prompt: 'What came to mind first when you saw it?',
          options: ['a living thing', 'a foetus, birth', 'something natural', 'a machine', 'an abstract form', 'something else'],
        },
        {
          label: 'THE MOVEMENT',
          prompt: 'What did the movement feel like, most strongly?',
          options: ['alive', 'irregular', 'tense', 'mechanical', 'nothing in particular'],
        },
        {
          label: 'RESPONSE',
          prompt: 'Could you feel the work responding to you?',
          options: ['very much', 'yes', 'somewhat', 'not really', 'not at all'],
        },
        {
          label: 'MEANING',
          prompt: 'Did it come across that relationships and interaction open up new possibilities?',
          options: ['very clearly', 'clearly', 'somewhat', 'not clearly', 'not at all'],
        },
      ],
      freeLabel: 'ANYTHING ELSE',
      freePrompt: 'Whatever stayed with you.',
      placeholder: '',
      submit: 'Submit',
      sending: 'Sending',
      thanks: 'Thank you.',
      thanksBody: [
        'What you have left behind becomes another new possibility.',
        'Just as the senses and thoughts of different people meet and carry on in directions nobody predicted,',
        'we hope this brief moment of taking part is where a new relationship, and a new possibility, begins.',
      ],
      failed: 'That did not send. Please try again.',
      unconfigured: 'The form is not connected yet.',
    },

    cards: [
      {
        photo: 'location',
        body: [
          '94 Wausan-ro, Mapo-gu, Seoul',
          'Student Union Building G, 1F — THE H READING LOUNGE, stair reading room',
        ],
        map: '마포구 와우산로 94 학생회관',
        mapLabel: 'Open in maps',
      },
      {
        body: [
          'Five axes breathe inside a membrane.',
          'Bring a hand near and the restlessness grows, quickens, begins to sound.',
        ],
        zones: true,
        colophon: COLOPHON_EN,
      },
      {
        body: [],
        steps: STEPS_EN,
      },
      {
        body: [],
        roles: SKILLS_EN,
      },
      {
        body: [],
        survey: true,
      },
    ],
  },

  ko: {
    other: 'EN',
    close: '닫기',

    zoneWord: '구간',
    drag: '끌어서 가까이',


    survey: {
      questions: [
        {
          label: '첫 인상',
          prompt: '작품을 보고 가장 먼저 떠오른 이미지는 무엇인가요?',
          options: ['생명체', '태아 · 탄생', '자연물', '기계', '추상적 형태', '기타'],
        },
        {
          label: '움직임',
          prompt: '작품의 움직임에서 가장 강하게 느껴진 인상은 무엇인가요?',
          options: ['살아 있는 듯함', '불규칙함', '긴장감', '기계적임', '특별한 인상 없음'],
        },
        {
          label: '반응',
          prompt: '관람객의 행동에 따라 작품이 반응한다는 점이 잘 느껴졌나요?',
          options: ['매우 그렇다', '그렇다', '보통이다', '그렇지 않다', '전혀 그렇지 않다'],
        },
        {
          label: '의미',
          prompt: '‘사람 간의 관계와 상호작용이 새로운 가능성을 만든다’는 의미가 전달되었나요?',
          options: ['매우 잘 전달되었다', '잘 전달되었다', '보통이다', '잘 전달되지 않았다', '전혀 전달되지 않았다'],
        },
      ],
      freeLabel: '자유롭게',
      freePrompt: '느낀 점이나 기억에 남은 부분을 적어주세요.',
      placeholder: '',
      submit: '제출',
      sending: '제출 중',
      thanks: '감사합니다.',
      thanksBody: [
        '당신이 남긴 생각 역시 또 하나의 새로운 가능성이 됩니다.',
        '서로 다른 사람의 감각과 생각이 만나 예상하지 못한 방향으로 이어지듯,',
        '이 짧은 참여 또한 새로운 관계와 가능성이 시작되는 작은 순간이 되기를 바랍니다.',
      ],
      failed: '전송되지 않았습니다. 다시 시도해주세요.',
      unconfigured: '폼이 아직 연결되지 않았습니다.',
    },

    cards: [
      {
        photo: 'location',
        body: [
          '서울 마포구 와우산로 94',
          '학생회관 G동 1층 THE H READING LOUNGE 계단열람실',
        ],
        map: '마포구 와우산로 94 학생회관',
        mapLabel: '지도에서 열기',
      },
      {
        body: [
          '다섯 개의 축이 막 안에서 숨을 쉽니다.',
          '손을 대면 그 뒤척임이 커지고, 빨라지고 소리를 냅니다.',
        ],
        zones: true,
        colophon: COLOPHON_KO,
      },
      {
        body: [],
        steps: STEPS_KO,
      },
      {
        body: [],
        roles: SKILLS_KO,
      },
      {
        body: [],
        survey: true,
      },
    ],
  },
};

// Lamps lit per zone, mirroring ZONE_LAMPS in the firmware. Zone 0 is the
// blinking idle state. The length of this is what the chart counts zones by, so
// changing the piece's zones means changing this line and nothing else here.
//
// Three zones, not five: five split the sensor's twelve centimetres into steps
// barely wider than its own jitter, and the piece kept changing its mind under
// anyone standing still.
export const ZONE_LAMPS = [2, 2, 4];
