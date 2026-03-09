/* ========================================
   ONE DAY DIARY - app.js (v2)
   ========================================
   - SPA: 홈(달력), 작성하기, 히스토리, 설정
   - 달력: 오늘만 작성 가능, 과거 작성 기록은 조회만
   - AI: OpenAI API 질문 생성 + 내용 기반 코멘트
   - 감성 톤: 따뜻함 / 발랄함 / 차분함
   ======================================== */

// ============================
// [설정] OpenAI API 키
// ============================
// 방법 1: 아래 변수에 직접 입력
// 방법 2: 브라우저 콘솔에서 localStorage.setItem('openai_api_key', 'sk-...')
let OPENAI_API_KEY = '';

// ============================
// [폴백] AI 없이도 동작하는 질문 목록
// ============================
const FALLBACK_QUESTIONS = [
  '오늘 가장 감사했던 순간은 언제였나요?',
  '지금 이 순간, 떠오르는 사람이 있다면 누구인가요?',
  '오늘 나를 웃게 만든 작은 일이 있었나요?',
  '요즘 가장 듣고 싶은 말은 무엇인가요?',
  '오늘 하루를 색깔로 표현한다면 어떤 색인가요?',
  '최근에 나를 설레게 한 것이 있나요?',
  '오늘 가장 오래 머문 생각은 무엇이었나요?',
  '지금 가장 가고 싶은 곳은 어디인가요?',
  '오늘 나에게 해주고 싶은 말이 있나요?',
  '최근에 새롭게 알게 된 것이 있나요?',
  '오늘 가장 맛있게 먹은 것은 무엇인가요?',
  '지금 듣고 있거나 듣고 싶은 노래가 있나요?',
  '오늘 하루 중 가장 평화로웠던 순간은?',
  '요즘 나의 작은 행복은 무엇인가요?',
  '내일의 나에게 한마디 한다면?',
  '최근에 용기를 냈던 순간이 있나요?',
  '오늘 하늘은 어떤 모습이었나요?',
  '지금 가장 기대되는 일은 무엇인가요?',
  '오늘 누군가에게 고마웠던 순간이 있나요?',
  '요즘 나를 가장 잘 표현하는 단어는?',
  '오늘 잠들기 전 떠오르는 한 장면은?',
  '최근에 나를 위해 한 일이 있나요?',
  '오늘 가장 인상 깊었던 풍경은?',
  '지금 이 순간 가장 하고 싶은 것은?',
  '오늘 새롭게 느낀 감정이 있나요?',
  '요즘 자주 생각나는 추억이 있나요?',
  '오늘 나를 성장시킨 일이 있었나요?',
  '지금 가장 소중한 것 세 가지는?',
  '오늘 발견한 작은 아름다움이 있나요?',
  '한 달 후의 나에게 하고 싶은 말은?',
  '오늘 하루를 한 문장으로 정리한다면?',
];

// ============================
// [폴백] AI 코멘트 대체 문구
// ============================
const FALLBACK_COMMENTS = [
  '오늘 하루도 충분히 잘 보냈구나, 고생 많았어.',
  '네 이야기를 들으니 마음이 따뜻해져.',
  '이런 하루도 소중한 기록이 될 거야.',
  '네가 느낀 감정들, 다 괜찮아.',
  '오늘을 이렇게 기록하는 너, 참 멋지다.',
  '작은 일상 속에서도 의미를 찾는 네가 대단해.',
  '내일은 오늘보다 조금 더 좋은 하루가 될 거야.',
  '이 기록이 나중에 좋은 추억이 될 거야.',
];

// ============================
// [이모지] AI 코멘트 랜덤 이모지
// ============================
const COMMENT_EMOJIS = ['🍀', '🐶', '🌸', '😄', '🌈', '⭐', '🎈', '🐱', '🌺', '✨', '🍊', '🐣'];

function getRandomEmoji() {
  return COMMENT_EMOJIS[Math.floor(Math.random() * COMMENT_EMOJIS.length)];
}

/**
 * 저장된 이모지 반환 (없으면 날짜 기반으로 고정 이모지 - 기존 항목 대응)
 */
function getEmojiForEntry(entry) {
  if (entry.emoji) return entry.emoji;
  const day = parseInt((entry.date || '01').split('-')[2], 10);
  return COMMENT_EMOJIS[day % COMMENT_EMOJIS.length];
}

// ============================
// [전역 변수]
// ============================
let selectedYear = null;
let selectedMonth = null;
let selectedDay = null;

// ============================
// [초기화] DOMContentLoaded
// ============================
document.addEventListener('DOMContentLoaded', () => {
  const splash = document.getElementById('splash');
  const app = document.getElementById('app');

  // localStorage에서 API 키 로드
  const savedKey = localStorage.getItem('openai_api_key');
  if (savedKey) OPENAI_API_KEY = savedKey;

  // 다크모드 복원
  if (localStorage.getItem('dark_mode') === 'true') {
    document.body.classList.add('dark-mode');
    document.getElementById('darkModeToggle').checked = true;
  }

  // AI 코멘트 토글 복원 (기본값: true)
  if (localStorage.getItem('ai_comment_enabled') === 'false') {
    document.getElementById('aiCommentToggle').checked = false;
  }

  // 2초 후 스플래시 → 앱 전환
  setTimeout(() => {
    splash.style.opacity = '0';
    splash.style.transition = 'opacity 0.4s ease';
    setTimeout(() => {
      splash.classList.add('hidden');
      app.classList.remove('hidden');
    }, 400);
  }, 2000);

  // 달력 렌더링
  renderCalendar(new Date());

  // 알림 배너 업데이트
  updateNotification();

  // 하단 네비게이션 이벤트
  initNavigation();

  // 작성하기 페이지 이벤트
  initWritePage();

  // 히스토리 뒤로가기
  document.getElementById('historyBackBtn').addEventListener('click', () => {
    navigateTo('home');
  });

  // 설정 페이지 이벤트
  initSettings();
});

// ========================================
// [SPA 네비게이션]
// ========================================

/**
 * 하단 네비게이션 버튼 이벤트 등록
 */
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;

      // '작성하기' 탭 → 오늘 날짜로 작성 모드 열기
      if (page === 'write') {
        const today = new Date();
        openWritePage(today.getFullYear(), today.getMonth() + 1, today.getDate(), 'write');
        return;
      }

      navigateTo(page);
    });
  });
}

/**
 * SPA 페이지 전환
 * @param {string} pageName - 'home' | 'write' | 'history' | 'settings'
 */
function navigateTo(pageName) {
  // 모든 페이지 비활성화 → 대상 활성화
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`page-${pageName}`);
  if (target) target.classList.add('active');

  // 네비게이션 하이라이트
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === pageName);
  });

  // 페이지별 진입 처리
  if (pageName === 'home') {
    renderCalendar(new Date());
    updateNotification();
  } else if (pageName === 'history') {
    renderHistory();
  }
}

// ========================================
// [달력]
// ========================================

/**
 * 기록된 날짜 목록 조회
 */
function getWrittenDates(year, month) {
  const key = `diary_${year}_${month}`;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

/**
 * 날짜를 기록 완료로 표시
 */
function markDateWritten(year, month, day) {
  const key = `diary_${year}_${month}`;
  const dates = getWrittenDates(year, month);
  if (!dates.includes(day)) {
    dates.push(day);
    localStorage.setItem(key, JSON.stringify(dates));
  }
}

/**
 * 달력 렌더링
 * - 오늘: 작성하기로 이동
 * - 과거 작성 완료: 조회 모드로 이동
 * - 과거 미작성 / 미래: 비활성 (클릭 불가)
 */
function renderCalendar(date) {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const writtenDates = getWrittenDates(year, month + 1);

  // 연도, 월 표시
  document.getElementById('calYear').textContent = `${year}년`;
  document.getElementById('calMonth').textContent = `${month + 1}월`;

  const grid = document.getElementById('calGrid');
  grid.innerHTML = '';

  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();

  // 빈 칸 (1일 이전)
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('button');
    empty.className = 'cal-day empty';
    empty.disabled = true;
    grid.appendChild(empty);
  }

  // 날짜 버튼 생성
  for (let d = 1; d <= lastDate; d++) {
    const dayBtn = document.createElement('button');
    dayBtn.className = 'cal-day';
    dayBtn.textContent = d;

    // 요일 색상
    const dayOfWeek = (firstDay + d - 1) % 7;
    if (dayOfWeek === 0) dayBtn.classList.add('sun');
    if (dayOfWeek === 6) dayBtn.classList.add('sat');

    const cellDate = new Date(year, month, d);
    const isToday = (year === today.getFullYear() && month === today.getMonth() && d === today.getDate());
    const isWritten = writtenDates.includes(d);
    const isPast = cellDate < todayStart;

    // 오늘 표시
    if (isToday) {
      dayBtn.classList.add('today');
    }

    // 기록 완료 dot 표시
    if (isWritten) {
      dayBtn.classList.add('written');
    }

    // 클릭 동작 분기
    if (isToday) {
      // 오늘 → 작성하기 (작성 모드)
      dayBtn.addEventListener('click', () => {
        openWritePage(year, month + 1, d, 'write');
      });
    } else if (isPast && isWritten) {
      // 과거 + 작성 완료 → 조회 모드
      dayBtn.addEventListener('click', () => {
        openWritePage(year, month + 1, d, 'view');
      });
    } else {
      // 미래 또는 과거 미작성 → 비활성
      dayBtn.classList.add('disabled');
    }

    grid.appendChild(dayBtn);
  }
}

/**
 * 홈 화면 알림 배너 업데이트 (비활성화)
 */
function updateNotification() {
  // 알림 배너 제거됨
}

// ========================================
// [AI 기능] OpenAI API 연동
// ========================================

/**
 * 오늘의 AI 질문 생성 (캐시 우선)
 * - 오늘 날짜 전용. 동일 날짜에는 동일 질문 유지.
 */
async function getAIQuestion(dateStr) {
  // localStorage 캐시 확인
  const cacheKey = `diary_question_${dateStr}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) return cached;

  // API 키 없으면 폴백
  if (!OPENAI_API_KEY) {
    const question = getFallbackQuestion(dateStr);
    localStorage.setItem(cacheKey, question);
    return question;
  }

  // OpenAI API 호출
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              '당신은 감성적인 일기 질문을 만드는 도우미입니다. ' +
              '하루를 돌아보게 하는 따뜻하고 감성적인 질문을 하나만 생성해주세요. ' +
              '질문은 한국어로, 한 문장으로 작성하세요. 물음표로 끝나야 합니다.',
          },
          {
            role: 'user',
            content: `오늘 날짜는 ${dateStr}입니다. 이 날짜에 어울리는 감성적인 일기 질문을 하나 만들어주세요.`,
          },
        ],
        max_tokens: 100,
        temperature: 0.8,
      }),
    });

    if (!response.ok) throw new Error('API 호출 실패');

    const data = await response.json();
    const question = data.choices[0].message.content.trim();
    localStorage.setItem(cacheKey, question);
    return question;
  } catch (error) {
    console.warn('AI 질문 생성 실패, 폴백 사용:', error);
    const question = getFallbackQuestion(dateStr);
    localStorage.setItem(cacheKey, question);
    return question;
  }
}

/**
 * AI 코멘트 생성 (개선된 프롬프트)
 * - 일기 내용의 핵심 키워드 반영
 * - 감정 읽기 + 구체적 공감
 * - 선택된 감성 톤 적용
 */
async function getAIComment(question, content) {
  // API 키 없으면 폴백
  if (!OPENAI_API_KEY) {
    return getFallbackComment();
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              '당신은 사용자의 일기에 공감 코멘트를 다는 따뜻한 친구입니다.\n' +
              '반드시 아래 규칙을 지켜주세요:\n' +
              '1. 사용자가 쓴 일기 내용에서 핵심 키워드나 구체적인 상황을 반드시 언급하세요.\n' +
              '2. 일기에 담긴 감정(기쁨, 슬픔, 피곤함, 설렘 등)을 정확히 읽고 반영하세요.\n' +
              '3. "일기 속 상황 언급 + 감정 공감" 구조로 한 문장을 작성하세요.\n' +
              '4. 추상적이거나 일반적인 위로("힘내세요", "수고했어요" 등)만으로 끝내지 마세요.\n' +
              '5. 반드시 일기 속 구체적인 내용과 연결된 문장이어야 합니다.\n' +
              '6. 한국어, 20~60자 이내로 작성하세요.',
          },
          {
            role: 'user',
            content: `질문: ${question}\n\n일기 내용: ${content}`,
          },
        ],
        max_tokens: 100,
        temperature: 0.7,
      }),
    });

    if (!response.ok) throw new Error('API 호출 실패');

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.warn('AI 코멘트 생성 실패:', error);
    return getFallbackComment();
  }
}

/**
 * 폴백 질문 (날짜 기반 결정적 선택)
 */
function getFallbackQuestion(dateStr) {
  const parts = dateStr.split('-');
  const day = parseInt(parts[2], 10);
  return FALLBACK_QUESTIONS[(day - 1) % FALLBACK_QUESTIONS.length];
}

/**
 * 폴백 코멘트 (랜덤 선택)
 */
function getFallbackComment() {
  return FALLBACK_COMMENTS[Math.floor(Math.random() * FALLBACK_COMMENTS.length)];
}

// ========================================
// [작성하기 페이지]
// ========================================

/**
 * 작성하기 페이지 이벤트 초기화
 */
function initWritePage() {
  // 뒤로가기 → 홈
  document.getElementById('writeBackBtn').addEventListener('click', () => {
    navigateTo('home');
  });

  // 우측 상단 + 저장 버튼
  document.getElementById('writeSaveTopBtn').addEventListener('click', saveDiary);

  // 홈으로 돌아가기 버튼
  document.getElementById('writeHomeBtn').addEventListener('click', () => {
    navigateTo('home');
  });
}

/**
 * 작성하기 페이지 열기
 * @param {number} year
 * @param {number} month - 1~12
 * @param {number} day
 * @param {'write'|'view'} mode - 'write': 오늘 작성, 'view': 과거 기록 조회
 */
async function openWritePage(year, month, day, mode) {
  selectedYear = year;
  selectedMonth = month;
  selectedDay = day;

  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  // 페이지 전환
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-write').classList.add('active');

  // 네비게이션 하이라이트
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === 'write');
  });

  // 날짜 표시 (본문 하단: YYYY.MM.DD 요일 형식)
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
  const dateObj = new Date(year, month - 1, day);
  const weekDay = weekDays[dateObj.getDay()];
  const dateFormatted = `${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')} ${weekDay}요일`;
  document.getElementById('writeDateDisplay').textContent = dateFormatted;

  // UI 요소 참조
  const questionEl = document.getElementById('writeQuestion');
  const textarea = document.getElementById('writeTextarea');
  const viewBox = document.getElementById('writeViewBox');
  const viewText = document.getElementById('writeViewText');
  const commentBubble = document.getElementById('writeCommentBubble');
  const commentText = document.getElementById('writeCommentText');
  const saveBtn = document.getElementById('writeSaveTopBtn');
  const homeBtn = document.getElementById('writeHomeBtn');

  // 기존 엔트리 로드
  const entryKey = `diary_entry_${dateStr}`;
  const existingEntry = localStorage.getItem(entryKey);
  const entry = existingEntry ? JSON.parse(existingEntry) : null;

  if (mode === 'write') {
    // === 작성 모드 (오늘) ===
    textarea.classList.remove('hidden');
    saveBtn.classList.remove('hidden');
    viewBox.classList.add('hidden');
    commentBubble.classList.add('hidden');
    homeBtn.classList.add('hidden');

    // 기존 내용이 있으면 프리필 (수정 가능)
    textarea.value = entry ? entry.content : '';

    // 질문 로딩
    questionEl.textContent = '질문을 불러오는 중...';
    const question = await getAIQuestion(dateStr);
    questionEl.textContent = question;

  } else {
    // === 조회 모드 (과거 작성 기록) ===
    textarea.classList.add('hidden');
    saveBtn.classList.add('hidden');
    viewBox.classList.remove('hidden');
    homeBtn.classList.remove('hidden');

    if (entry) {
      // 저장된 질문 표시
      questionEl.textContent = entry.question;

      // 저장된 내용 표시
      viewText.textContent = entry.content;

      // AI 코멘트 표시 (저장된 이모지 그대로 사용)
      if (entry.comment) {
        document.getElementById('writeBubbleEmoji').textContent = getEmojiForEntry(entry);
        commentText.textContent = entry.comment;
        commentBubble.classList.remove('hidden');
      } else {
        commentBubble.classList.add('hidden');
      }
    }
  }
}

/**
 * 일기 저장 처리
 * 1) 일기 저장
 * 2) AI 코멘트 생성
 * 3) 말풍선으로 코멘트 표시
 * 4) written 표시
 */
async function saveDiary() {
  const content = document.getElementById('writeTextarea').value.trim();

  if (!content) {
    alert('일기 내용을 작성해주세요.');
    return;
  }

  const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  const question = document.getElementById('writeQuestion').textContent;
  const aiEnabled = localStorage.getItem('ai_comment_enabled') !== 'false';

  let comment = '';
  let emoji = '';

  if (aiEnabled) {
    // 로딩 오버레이 표시
    document.getElementById('writeLoading').classList.remove('hidden');
    comment = await getAIComment(question, content);
    document.getElementById('writeLoading').classList.add('hidden');
    if (comment) emoji = getRandomEmoji(); // 저장 시 한 번만 생성
  }

  // localStorage에 저장 (이모지도 함께)
  const entry = {
    date: dateStr,
    question: question,
    content: content,
    comment: comment,
    emoji: emoji,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(`diary_entry_${dateStr}`, JSON.stringify(entry));

  // 날짜 기록 완료 표시
  markDateWritten(selectedYear, selectedMonth, selectedDay);

  // UI 전환: 작성 모드 → 저장 완료 뷰
  document.getElementById('writeTextarea').classList.add('hidden');
  document.getElementById('writeSaveTopBtn').classList.add('hidden');

  // 저장된 내용 표시
  document.getElementById('writeViewText').textContent = content;
  document.getElementById('writeViewBox').classList.remove('hidden');

  // AI 코멘트 말풍선 표시 (활성화된 경우만)
  if (aiEnabled && comment) {
    document.getElementById('writeBubbleEmoji').textContent = emoji;
    document.getElementById('writeCommentText').textContent = comment;
    document.getElementById('writeCommentBubble').classList.remove('hidden');
  }

  // 홈으로 돌아가기 버튼 표시
  document.getElementById('writeHomeBtn').classList.remove('hidden');
}

// ========================================
// [히스토리 페이지]
// ========================================

/**
 * 히스토리 목록 렌더링 (최신순)
 */
function renderHistory() {
  const historyList = document.getElementById('historyList');
  historyList.innerHTML = '';

  // localStorage에서 모든 diary_entry_ 수집
  const entries = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('diary_entry_')) {
      try {
        entries.push(JSON.parse(localStorage.getItem(key)));
      } catch (e) {
        // 파싱 실패 무시
      }
    }
  }

  // 최신순 정렬
  entries.sort((a, b) => b.date.localeCompare(a.date));

  // 빈 상태
  if (entries.length === 0) {
    historyList.innerHTML = `
      <div class="history-empty">
        <p class="history-empty-text">아직 작성된 일기가 없어요</p>
        <p class="history-empty-sub">오늘의 질문에 답해보세요!</p>
      </div>
    `;
    return;
  }

  // 카드 생성
  entries.forEach(entry => {
    const card = document.createElement('div');
    card.className = 'history-card';

    const [y, m, d] = entry.date.split('-');
    const dateDisplay = `${parseInt(y)}년 ${parseInt(m)}월 ${parseInt(d)}일`;

    const safeContent = escapeHtml(entry.content);
    const safeQuestion = escapeHtml(entry.question);
    const safeComment = entry.comment ? escapeHtml(entry.comment) : '';

    card.innerHTML = `
      <p class="history-card-date">${dateDisplay}</p>
      <p class="history-card-question">${safeQuestion}</p>
      <p class="history-card-content">${safeContent}</p>
      ${safeComment ? `<div class="history-card-comment"><span class="comment-label">${getEmojiForEntry(entry)}</span>${safeComment}</div>` : ''}
    `;

    historyList.appendChild(card);
  });
}

// ========================================
// [설정 페이지]
// ========================================

/**
 * 설정 페이지 이벤트 초기화
 */
function initSettings() {
  // AI 코멘트 토글
  document.getElementById('aiCommentToggle').addEventListener('change', (e) => {
    localStorage.setItem('ai_comment_enabled', e.target.checked.toString());
  });

  // 다크모드 토글
  document.getElementById('darkModeToggle').addEventListener('change', (e) => {
    document.body.classList.toggle('dark-mode', e.target.checked);
    localStorage.setItem('dark_mode', e.target.checked.toString());
  });

  // 전체 기록 삭제 토글 (켜면 삭제 후 자동으로 다시 OFF)
  document.getElementById('clearDataToggle').addEventListener('change', (e) => {
    if (e.target.checked) {
      if (confirm('정말 모든 데이터를 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.')) {
        // 설정값은 보존
        const darkMode = localStorage.getItem('dark_mode');
        const aiComment = localStorage.getItem('ai_comment_enabled');
        const apiKey = localStorage.getItem('openai_api_key');

        localStorage.clear();

        if (darkMode) localStorage.setItem('dark_mode', darkMode);
        if (aiComment) localStorage.setItem('ai_comment_enabled', aiComment);
        if (apiKey) localStorage.setItem('openai_api_key', apiKey);

        alert('모든 일기 데이터가 삭제되었습니다.');
        navigateTo('home');
      }
      // 삭제 여부와 관계없이 토글은 항상 OFF로 복귀
      e.target.checked = false;
    }
  });
}

// ========================================
// [유틸리티]
// ========================================

/**
 * HTML 특수문자 이스케이프 (XSS 방지)
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Date → 'YYYY-MM-DD' 문자열 변환
 */
function formatDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
