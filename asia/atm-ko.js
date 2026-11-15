/* atm-ko.js v1 (2026-11-15): Korean UI for the Asia Tango Map.
   Loaded only when the visitor chose Korean (asiaMapLang = ko, or ?lang=ko).
   The page runs as the English page; this file swaps the English UI words for Korean.
   Event content (names, notes, venues, addresses, organizers) is NOT translated here:
   it follows the card's own *_ko fields when they exist (atm-i18n.js), otherwise English.
   Exact-match only, so an event called "Milonga Cool" is never touched. */
(function () {
  var D = document, R = D.documentElement;
  if (!/^ko/i.test(R.getAttribute('data-asia-lang') || R.lang || '')) return;

  var CITY = {
    'Shanghai': '상하이', 'Beijing': '베이징', 'Tianjin': '톈진', 'Guangzhou': '광저우', 'Qingdao': '칭다오',
    'Chengdu': '청두', 'Shenzhen': '선전', 'Chongqing': '충칭', 'Haikou': '하이커우', 'Hangzhou': '항저우',
    "Xi'an": '시안', 'Zhengzhou': '정저우', 'Zhuhai': '주하이', 'Nanjing': '난징', 'Suzhou': '쑤저우', 'Wuhan': '우한',
    'Hong Kong': '홍콩', 'Macau': '마카오', 'Taiwan': '대만', 'Taipei': '타이베이', 'New Taipei': '신베이',
    'Taichung': '타이중', 'Tainan': '타이난', 'Hsinchu': '신주', 'Zhubei': '주베이', 'Miaoli': '먀오리',
    'Seoul': '서울', 'Busan': '부산', 'Daegu': '대구', 'Daejeon': '대전', 'Gwangju': '광주', 'Ulsan': '울산',
    'Changwon': '창원', 'Cheongju': '청주', 'Gunsan': '군산', 'Jinju': '진주', 'Pohang': '포항',
    'Tokyo': '도쿄', 'Osaka': '오사카', 'Singapore': '싱가포르', 'Kuala Lumpur': '쿠알라룸푸르', 'Penang': '페낭',
    'Da Nang': '다낭', 'Bandar Seri Begawan': '반다르스리브가완',
    'China': '중국', 'South Korea': '한국', 'Korea': '한국', 'Japan': '일본', 'Malaysia': '말레이시아',
    'Vietnam': '베트남', 'Brunei': '브루나이', 'Others': '기타', 'Mainland China': '중국 본토'
  };
  var TYPE = {
    'Milonga': '밀롱가', 'Práctica': '쁘락띠까', 'Practica': '쁘락띠까', 'Práctilonga': '쁘락띠롱가', 'Practilonga': '쁘락띠롱가',
    'Festival': '페스티벌', 'Marathon': '마라톤', 'Encuentro': '엔쿠엔트로', 'Weekend': '위켄드',
    'Encuentro / Weekend': '엔쿠엔트로 / 위켄드', 'Anniversary': '애니버서리 밀롱가', 'Workshop': '워크숍',
    'Championship': '챔피언십', 'Event': '이벤트', 'Class': '클래스', 'One-off': '단발',
    'Weekly': '매주', 'Monthly': '매월', 'Biweekly': '격주'
  };
  var WD = { Sun: '일', Mon: '월', Tue: '화', Wed: '수', Thu: '목', Fri: '금', Sat: '토' };
  var WDL = { Sunday: '일요일', Monday: '월요일', Tuesday: '화요일', Wednesday: '수요일', Thursday: '목요일', Friday: '금요일', Saturday: '토요일' };
  var NTH = { '1st': '첫째', '2nd': '둘째', '3rd': '셋째', '4th': '넷째', '5th': '다섯째', 'Last': '마지막' };

  var S = {
    /* header, tabs, home */
    'Asia Tango Map': '아시아 탱고 지도', 'Add event': '이벤트 추가', 'Saved': '저장', 'Regular': '정기', 'Special': '스페셜',
    'Filter': '필터', 'See all ›': '전체 보기 ›', 'Month': '월', 'Week': '주', 'Today': '오늘', 'From today': '오늘부터',
    'by date': '날짜순', 'From today · by date': '오늘부터 · 날짜순', 'Upcoming special': '다가오는 스페셜 이벤트',
    'Other cities': '다른 도시', 'All regular': '정기 전체', 'All special': '스페셜 전체', 'Special events': '스페셜 이벤트',
    'Regular events': '정기 이벤트', 'regular events': '정기 이벤트', 'regular event': '정기 이벤트',
    'special event': '스페셜 이벤트', 'Mainland China · weekly · pick a city': '중국 본토 · 매주 · 도시 선택',
    'Choose events': '이벤트 선택', 'All events': '모든 이벤트', 'All cities': '모든 도시', 'All events · All cities': '모든 이벤트 · 모든 도시',
    'events': '이벤트', 'Events': '이벤트', 'Collapse': '접기', 'Expand': '펼치기', 'No events': '이벤트 없음',
    'No events found': '이벤트를 찾지 못했습니다', 'Clear filters': '필터 지우기', 'Finding milongas…': '밀롱가 찾는 중…',
    'No saved events yet. Tap the star on an event to save it.': '저장한 이벤트가 아직 없습니다. 이벤트의 별을 눌러 저장하세요.',
    'Tap the star on an event to save it.': '이벤트의 별을 눌러 저장하세요.',
    'Tap ☆ on an event to save it here': '이벤트의 ☆를 누르면 여기에 저장됩니다',
    'After you verify your email, this list restores on your other devices': '이메일 인증 후에는 다른 기기에서도 이 목록이 복원됩니다',
    'Festivals': '페스티벌', 'Marathons': '마라톤', 'Encuentros / Weekends': '엔쿠엔트로 / 위켄드', 'Anniversaries': '애니버서리 밀롱가',
    'Workshops': '워크숍', 'Last': '마지막', 'Cancelled': '취소됨', 'Paused this week': '이번 주 휴무',
    'Remove from favorites': '저장 취소', 'Add to favorites': '저장', 'Save': '저장', 'Next': '다음',
    'Saved events': '저장한 이벤트', 'Choose city': '도시 선택', 'Choose a city': '도시 선택', 'Select a city': '도시 선택',
    'Later dates are projected from the weekly schedule and may change. Please confirm with the organizer.': '이후 날짜는 정기 일정으로 추정한 것이며 바뀔 수 있습니다. 주최자에게 확인해 주세요.',
    'Favorites': '저장', 'FAVORITES': '저장', 'My saved events': '내가 저장한 이벤트', 'Recommended': '추천', 'RECOMMENDED': '추천',
    'Weekly milongas & practicas': '매주 열리는 밀롱가 · 쁘락띠까', '— Weekly milongas & practicas': '— 매주 열리는 밀롱가 · 쁘락띠까',
    'No events match these filters in this city.': '이 도시에 조건에 맞는 이벤트가 없습니다.',
    'No listings match these filters.': '조건에 맞는 이벤트가 없습니다.', 'All cities · Special events by start date': '모든 도시 · 스페셜 이벤트 (시작일순)',
    'Weekly milonga · This week\'s theme': '매주 밀롱가 · 이번 주 테마', 'TBA': '미정',
    /* card */
    'Venue': '장소', 'ORG': '주최', 'Organizer': '주최자', 'Address': '주소', 'City': '도시', 'Time': '시간', 'Fee': '요금',
    'Notes': '참고', 'Note': '참고', 'Notice': '공지', 'More': '더 보기', 'Less': '접기', 'Collapse ⌃': '접기 ⌃',
    'Links': '링크', 'Website': '웹사이트', 'Event website': '이벤트 웹사이트', 'Video': '영상', 'Register': '등록',
    'Details': '상세', 'Event details': '이벤트 상세', 'Phone': '전화', 'Email': '이메일', 'WeChat': '위챗',
    'WeChat ID:': '위챗 ID:', 'Phone:': '전화:', 'Email:': '이메일:', 'Phone/WeChat:': '전화/위챗:',
    'WeChat Article': '위챗 글', 'WeChat article': '위챗 글', 'Temporarily changed': '임시 변경',
    'Newer poster': '최신 포스터', 'Older poster': '이전 포스터', 'Past poster': '지난 포스터', 'Previous poster': '이전 포스터', 'Next poster': '다음 포스터',
    'ENDED': '종료', 'This event has ended': '종료된 이벤트입니다', 'View all events': '모든 이벤트 보기', 'Next edition:': '다음 회차:',
    '📷 Recap': '📷 후기', 'Photos:': '사진:', '★ Special events': '★ 스페셜 이벤트', 'This card is not on the map': '지도에 없는 카드입니다',
    'The map could not load this card. That does not mean the event has ended.': '이 카드를 불러오지 못했습니다. 이벤트가 끝났다는 뜻은 아닙니다.',
    'Try again': '다시 시도', 'Back': '뒤로', 'Back to list': '목록으로', 'Search': '검색', 'Menu': '메뉴', 'Close': '닫기', 'Map ↗': '지도 ↗', 'Enlarge': '크게 보기', 'Show this to a driver': '기사님께 보여 주세요', 'Open map': '지도 열기', 'Copy address': '주소 복사', 'Copied': '복사됨', 'Route pictures': '찾아오는 길 사진', 'Directions': '오시는 길',
    'No · Not confirmed, please contact the organizer': '아니요 · 미확인, 주최자에게 문의하세요',
    'Viewed': '본 이벤트', 'Recently viewed': '최근 본 이벤트', 'Hide': '숨기기', 'Show': '보기', 'Clear': '지우기',
    /* menu */
    'Sources': '자료 출처', 'Contact': '연락', 'Email us': '이메일 보내기', 'Subscribe': '구독', 'Submit event': '이벤트 제보',
    'Share': '공유', 'Copy link': '링크 복사', 'Refresh': '새로고침', 'My ATM': '나의 ATM', 'About': '정보', 'My profile': '내 정보', 'Subscription & account': '구독 및 계정',
    'Cancel': '취소', 'Copied': '복사됨', 'More actions': '더 보기', 'Language': '언어',
    /* notice */
    'Beta Notice & Disclaimer': '베타 서비스 안내 및 면책 고지',
    'Asia Tango Map (ATM) is still in beta. Event information may be inaccurate or out of date.': '아시아 탱고 지도(ATM)는 현재 베타 버전으로 운영되고 있으며, 일부 이벤트 정보가 부정확하거나 최신 정보와 다를 수 있습니다.',
    'Before attending, please confirm the date, time, venue, itinerary and registration arrangements directly with the organizer before making travel plans or payments. The organizer’s latest confirmation takes precedence. This site provides information for reference only; saving an event or selecting Going / Interested is not a formal registration.': '이벤트 참석이나 여행 계획, 결제 전 반드시 주최자에게 날짜, 시간, 장소, 일정 및 등록 방법을 직접 확인해 주시기 바랍니다. 최신 정보는 주최자의 공식 안내를 우선으로 합니다.\n\n본 사이트의 정보는 참고용이며, 이벤트를 저장하거나 \'참석\' 또는 \'관심\'을 선택하더라도 정식 참가 신청이나 등록이 완료되는 것은 아닙니다.',
    'I understand, enter the site': '확인했습니다, 사이트로 들어가기',
    /* submit-event form */
    'Event name': '이벤트 이름', 'Date': '날짜', 'Your email': '이메일', '(Required)': '(필수)', 'required': '필수',
    'Your WeChat ID': '위챗 ID', 'Submit': '보내기', 'Thank you': '감사합니다', 'One-time or regular': '단발 또는 정기',
    'State one-time or regular; for regular, give the frequency, e.g. weekly or monthly': '단발인지 정기인지 적어 주세요. 정기라면 주기도 함께 (예: 매주, 매월)',
    'Event info compiled from WeChat and Facebook, with reference to': '이벤트 정보는 위챗과 페이스북에서 모았으며, 다음 사이트를 참고했습니다:',
    '. Please check the organizer\'s latest announcement for times and details.': '. 시간과 상세 내용은 주최자의 최신 공지를 확인해 주세요.',
    /* star / going */
    'Going': '참석', 'Interested': '관심', 'Not Going': '불참', 'Withdraw': '취소', 'Keep': '유지', 'Confirm': '확인',
    'Saved. Find it under Saved.': '저장했습니다. ‘저장’ 탭에서 볼 수 있습니다.',
    'Want a note when these events change or registration closes?': '이 이벤트들의 신청 마감이나 변경이 있을 때 알려 드릴까요?', 'No thanks': '괜찮아요', 'Get special-event news': '대형 이벤트 소식 받기', 'New festivals, marathons and registration deadlines, sent now and then': '새 페스티벌, 마라톤, 신청 마감 소식을 가끔 보내 드립니다',
    'Saved. This one is not sent to the organizer.': '저장했습니다. 주최자에게는 알리지 않습니다.',
    'Remove this event from favorites?': '이 이벤트를 저장 목록에서 뺄까요?',
    'Not a ticket or a formal registration.': '티켓이나 정식 등록이 아닙니다.',
    'The organizer gets your name. This is not a booking or ticket.': '주최자에게 이름이 전달됩니다. 예약이나 티켓이 아닙니다.',
    'Going is not a ticket or a formal registration.': '참석은 티켓이나 정식 등록이 아닙니다.',
    'Get early-bird, deadline and organizer notices for this event': '이 이벤트의 얼리버드·마감·주최자 소식 받기',
    'First time: enter your email and the last 4 digits of your mobile, then tap the link in the confirmation email. After that, the same two fields sign you in.': '처음: 이메일과 휴대폰 끝 4자리를 입력하고 확인 메일의 링크를 누르세요. 이후에는 같은 두 항목으로 바로 로그인됩니다.',
    'Complete your details and send the confirmation email. Tap the link in it and you\u2019re done.': '정보를 입력하고 확인 메일을 보내 주세요. 메일의 링크를 누르면 완료됩니다.',
    'Event news': '이벤트 소식',
    'The confirmation link may open in another browser. After confirming, come back here (e.g. WeChat) and sign in with the same email and last 4 digits.': '확인 링크는 다른 브라우저에서 열릴 수 있습니다. 확인 후 이곳(예: 위챗)으로 돌아와 같은 이메일과 휴대폰 끝 4자리로 로그인하세요.',
    'Event news now and then, mostly special events. Unsubscribe any time.': '이벤트 소식을 가끔 보내 드립니다. 스페셜 이벤트 위주이며 언제든 구독 해지할 수 있습니다.',
    'Going to an event? On its page choose Going or Interested, and the organizer can tell you about early-bird prices, deadlines and directions.': '가고 싶은 이벤트가 있나요? 이벤트 페이지에서 \'참석\' 또는 \'관심\'을 선택하면 주최자가 얼리버드 가격, 등록 마감, 오시는 길을 알려 줄 수 있습니다.', 'Directions (optional)': '오시는 길 (선택)',
    'Get early-bird deadlines, directions and updates from the organizer.': '주최자로부터 얼리버드 마감, 오시는 길, 변경 소식을 받습니다.',
    'Choose Going, Interested, or Not Going.': '참석, 관심, 불참 중에서 고르세요.',
    'Confirm your email first. Your intent is saved when you confirm.': '먼저 이메일을 인증하세요. 인증하면 선택이 저장됩니다.',
    'All fields are required': '모든 항목을 입력해야 합니다',
    'After one verification on this device, you won’t need to verify again to choose Going or Interested.': '이 기기에서 한 번 인증하면, 이후 참석·관심을 고를 때 다시 인증할 필요가 없습니다.',
    'Confirmation email sent. Your intent is saved when you confirm.': '인증 메일을 보냈습니다. 인증하면 선택이 저장됩니다.',
    'Email sent — please confirm in your inbox': '메일을 보냈습니다 — 받은편지함에서 인증해 주세요',
    'Didn\'t get the email? Check your spam or junk folder.': '메일이 오지 않았나요? 스팸함을 확인해 주세요.',
    'Check your spam folder first. You can resend once after 1 minute.': '먼저 스팸함을 확인하세요. 1분 후 한 번 다시 보낼 수 있습니다.',
    'Already resent. Please check your inbox, or try again later.': '이미 다시 보냈습니다. 받은편지함을 확인하거나 잠시 후 다시 시도하세요.',
    'Resend verification email': '인증 메일 다시 보내기', 'Email confirmed. Your intent is saved.': '이메일이 인증되었습니다. 선택이 저장되었습니다.',
    'Email verified. Profile saved. Use the star on an event to choose Going or Interested.': '이메일 인증 완료. 정보가 저장되었습니다. 이벤트의 별을 눌러 참석 또는 관심을 고르세요.',
    'Saved. The organizer will be notified.': '저장했습니다. 주최자에게 알립니다.', 'Saved. The organizer email was not found.': '저장했습니다. 주최자 이메일을 찾지 못했습니다.',
    'RSVP unavailable. Please contact the organizer.': '참석 신청을 받을 수 없습니다. 주최자에게 문의하세요.',
    'Saved. The notification failed to send.': '저장했습니다. 알림 발송은 실패했습니다.',
    'Please complete city, role, and any missing fields. No need to re-verify the same email.': '도시, 역할 등 빠진 항목을 채워 주세요. 같은 이메일은 다시 인증할 필요가 없습니다.',
    'Cancel intent': '선택 취소', 'Cancel this intent? We will not email the organizer again, and mail already sent is not recalled.': '선택을 취소할까요? 주최자에게 다시 메일을 보내지 않으며, 이미 보낸 메일은 회수되지 않습니다.',
    'Intent cancelled. No new email was sent to the organizer.': '선택을 취소했습니다. 주최자에게 새 메일은 보내지 않았습니다.',
    'Email confirmed': '이메일 인증됨', 'Unsubscribe from this event’s updates (keeps your Going / Interested)': '이 이벤트 소식 받지 않기 (참석 / 관심은 유지)',
    'Date (Beijing time, UTC+8)': '날짜 (베이징 시간, UTC+8)', 'No event intents yet.': '아직 선택한 이벤트가 없습니다.',
    'Organizer email not available yet': '주최자 이메일이 아직 없습니다', 'Checking organizer email': '주최자 이메일 확인 중',
    'Finish the human check, then tap Confirm.': '사람 확인을 마친 뒤 확인을 누르세요.', 'Finish the human check, then send.': '사람 확인을 마친 뒤 보내세요.',
    'The check did not finish. Wait a moment and try again.': '확인이 끝나지 않았습니다. 잠시 후 다시 시도하세요.',
    'The check expired. Wait until it finishes, then try again.': '확인 시간이 지났습니다. 끝날 때까지 기다린 뒤 다시 시도하세요.',
    'The check timed out. Please try again.': '확인 시간이 초과되었습니다. 다시 시도하세요.',
    'The check was not accepted. Wait until it finishes, then try again.': '확인이 통과되지 않았습니다. 끝날 때까지 기다린 뒤 다시 시도하세요.',
    'Network error. Please try again.': '네트워크 오류입니다. 다시 시도하세요.', 'This did not go through. Please try again.': '처리되지 않았습니다. 다시 시도하세요.',
    'Please try again later.': '잠시 후 다시 시도하세요.', 'Too many confirmation emails. Please try again later.': '인증 메일을 너무 많이 보냈습니다. 잠시 후 다시 시도하세요.',
    'Event intent': '이벤트 선택', 'Manage intent': '선택 관리', 'Intent saved': '선택 저장됨',
    'Tap the star to choose Going or Interested. It shows here after you verify your email.': '별을 눌러 참석 또는 관심을 고르세요. 이메일 인증 후 여기에 표시됩니다.',
    /* subscribe / sign in */
    'Name': '이름', 'Your name': '이름', 'Your city': '도시',
    'Role': '역할', 'Choose': '선택', 'Leader': '리더', 'Follower': '팔로워', 'Both': '둘 다',
    'Please enter your name.': '이름을 입력하세요.', 'Please enter your city.': '도시를 입력하세요.',
    'Please choose Leader, follower, or both.': '리더, 팔로워, 둘 다 중에서 고르세요.', 'Join ATM site-wide subscription': 'ATM 전체 소식 구독하기',
    'Please enter your email.': '이메일을 입력하세요.', 'Please check your email address.': '이메일 주소를 확인하세요.',
    'We couldn’t send the verification email. Check the address or try again.': '인증 메일을 보내지 못했습니다. 주소를 확인하거나 다시 시도하세요.',
    'Already subscribed? Enter your email and the last 4 digits of your mobile. You don’t need another confirmation email.': '이미 구독하셨나요? 이메일과 휴대폰 번호 끝 4자리를 입력하세요. 인증 메일을 다시 받을 필요가 없습니다.',
    'Mobile number': '휴대폰 번호', 'Mobile last 4 digits': '휴대폰 끝 4자리', 'Sign in': '로그인', 'Signing in…': '로그인 중…',
    ' (optional)': ' (선택)', '(optional)': '(선택)', 'Check your email': '메일함을 확인하세요', 'Confirmation email sent to:': '확인 메일을 보낸 주소:',
    'Open your email. Not there? Check spam or junk.': '메일함을 여세요. 안 보이면 스팸함을 확인하세요.', 'Tap Confirm in the email.': '메일의 「확인」 버튼을 누르세요.',
    'Tap Confirm in the email, or enter its 6-digit code below.': '메일의 「확인」 버튼을 누르거나, 아래에 메일 속 6자리 코드를 입력하세요.',
    'Come back to this page. You\u2019ll be signed in automatically.': '이 페이지로 돌아오면 자동으로 로그인됩니다.',
    '6-digit code': '6자리 코드', 'Sign in with code': '코드로 로그인', 'That code is not right.': '코드가 맞지 않습니다.',
    'The code has expired. Please send again.': '코드가 만료되었습니다. 다시 보내 주세요.', 'Too many wrong codes. Please send again.': '틀린 횟수가 너무 많습니다. 다시 보내 주세요.',
    'Didn\u2019t get it? Send again': '못 받았나요? 다시 보내기', 'Confirmed? Sign in': '확인했나요? 바로 로그인',
    'After you tap the confirmation link, your email and the last 4 digits sign you in.': '확인 링크를 누른 뒤에는 이메일과 휴대폰 끝 4자리로 로그인할 수 있습니다.',
    'No human check showing? It may be the network. Turn off VPN, or switch Wi-Fi / mobile data, then reopen this page.': '사람 확인 창이 안 보이나요? 네트워크 문제일 수 있습니다. VPN을 끄거나 Wi-Fi／모바일 데이터를 바꾼 뒤 이 페이지를 다시 여세요.',
    'Or enter the 6-digit code from the email': '또는 메일 속 6자리 코드를 입력하세요',
    'Register / sign in': '가입 / 로그인', 'Send confirmation email': '인증 메일 보내기', 'Send verification email': '인증 메일 보내기',
    'Please enter your phone number.': '전화번호를 입력하세요.', 'That phone number does not look valid.': '전화번호가 올바르지 않습니다.',
    'Enter the last 4 digits of your mobile.': '휴대폰 번호 끝 4자리를 입력하세요.', 'The email or the mobile last 4 digits did not match.': '이메일 또는 휴대폰 끝 4자리가 맞지 않습니다.',
    'Saving…': '저장 중…', 'Unsubscribe': '구독 해지', 'Sending…': '보내는 중…', 'Confirmed': '인증됨',
    'Profile saved. This device is already verified, so no new email was sent.': '정보를 저장했습니다. 이 기기는 이미 인증되어 새 메일은 보내지 않았습니다.',
    'Something went wrong. Please try again later.': '문제가 생겼습니다. 잠시 후 다시 시도하세요.', 'Too many tries. Please try again later.': '시도가 너무 많습니다. 잠시 후 다시 시도하세요.',
    'My subscription': '내 구독', 'Copy': '복사', 'New link': '새 링크', 'A new link stops the old one. Continue?': '새 링크를 만들면 이전 링크는 쓸 수 없습니다. 계속할까요?',
    'Open this link in WeChat, Safari, Chrome, or another browser to sign in. No new confirmation email.': '이 링크를 위챗, 사파리, 크롬 등에서 열면 로그인됩니다. 인증 메일은 다시 오지 않습니다.',
    'This browser does not have the link saved. A new link stops the old one.': '이 브라우저에는 링크가 저장되어 있지 않습니다. 새 링크를 만들면 이전 링크는 쓸 수 없습니다.',
    'The link saved in this browser no longer works. You can make a new one.': '이 브라우저에 저장된 링크는 더 이상 쓸 수 없습니다. 새로 만들 수 있습니다.',
    'The subscription link could not be loaded. Try again later.': '구독 링크를 불러오지 못했습니다. 잠시 후 다시 시도하세요.',
    /* how-to, intro, push */
    'Find tango in 3 steps': '3단계로 탱고 찾기', 'Got it': '알겠습니다', 'Asia Tango Map — find Argentine tango across Asia': '아시아 탱고 지도 — 아시아의 아르헨티나 탱고 찾기',
    '— find Argentine tango across Asia': '— 아시아의 아르헨티나 탱고 찾기', 'Milongas, festivals & marathons near you': '가까운 밀롱가, 페스티벌, 마라톤',
    '🔔 Turn on push alerts': '🔔 푸시 알림 켜기', '🔕 Turn off push alerts': '🔕 푸시 알림 끄기', 'Working…': '처리 중…',
    'Push alerts are off.': '푸시 알림이 꺼졌습니다.', 'This browser does not support push notifications.': '이 브라우저는 푸시 알림을 지원하지 않습니다.',
    'Could not turn on push alerts. Please try again later.': '푸시 알림을 켜지 못했습니다. 잠시 후 다시 시도하세요.',
    'None yet': '아직 없음', 'prev': '이전', 'next': '다음',
    'Sun': '일', 'Mon': '월', 'Tue': '화', 'Wed': '수', 'Thu': '목', 'Fri': '금', 'Sat': '토',
    'Sunday': '일요일', 'Monday': '월요일', 'Tuesday': '화요일', 'Wednesday': '수요일', 'Thursday': '목요일', 'Friday': '금요일', 'Saturday': '토요일'
  };
  /* whole elements whose text is split by inline tags (<em>, <b>): matched on textContent, replaced as HTML */
  var SE = {
  };
  var k; for (k in CITY) if (!S[k]) S[k] = CITY[k];
  for (k in TYPE) if (!S[k]) S[k] = TYPE[k];
  var WDK = 'Sun|Mon|Tue|Wed|Thu|Fri|Sat', WDLK = 'Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday';

  function city(s) { return CITY[s] || s; }
  function type(s) { return TYPE[s] || S[s] || s; }
  /* " · Beijing" / " · Workshop" tails after a date or time */
  function tail(s) { return s.split(' · ').map(function (p, i) { return i ? (CITY[p] || TYPE[p] || S[p] || p) : p; }).join(' · '); }

  var P = [
    [new RegExp('^(Today · )?(' + WDK + ') (\\d{1,2}/\\d{1,2})$'), function (m) { return (m[1] ? '오늘 · ' : '') + m[3] + ' (' + WD[m[2]] + ')'; }],
    [new RegExp('^(' + WDLK + ') (\\d{1,2}/\\d{1,2})$'), function (m) { return m[2] + ' (' + WDL[m[1]] + ')'; }],
    [new RegExp('^Every other (' + WDK + '|' + WDLK + ')\\b(.*)$'), function (m) { return '격주 ' + (WD[m[1]] ? WD[m[1]] + '요일' : WDL[m[1]]) + tail(m[2]); }],
    [new RegExp('^Every (' + WDK + '|' + WDLK + ')\\b(.*)$'), function (m) { return '매주 ' + (WD[m[1]] ? WD[m[1]] + '요일' : WDL[m[1]]) + tail(m[2]); }],
    [new RegExp('^((?:1st|2nd|3rd|4th|5th|Last)(?:(?: & |, | and )(?:1st|2nd|3rd|4th|5th|Last))*) (' + WDLK + ')(?: of the month)?( .*)?$'), function (m) {
      return '매월 ' + m[1].split(/ & |, | and /).map(function (x) { return NTH[x]; }).join('·') + ' ' + WDL[m[2]] + (m[3] ? ' ' + type(m[3].trim()) : ''); }],
    [/^(Weekly|Monthly|Biweekly|One-off) · (.+)$/, function (m) { return TYPE[m[1]] + ' · ' + type(m[2]); }],
    [/^([\d/–:\- ]+) · (.+)$/, function (m) { return m[1] + ' · ' + tail(m[2]).split(' · ').map(type).join(' · '); }],
    [/^Upcoming special · (.+)$/, function (m) { return '다가오는 스페셜 이벤트 · ' + city(m[1]); }],
    [/^(.+) ▾$/, function (m) { return CITY[m[1]] ? CITY[m[1]] + ' ▾' : null; }],
    [/^(.+) \((\d+)\)$/, function (m) { return CITY[m[1]] ? CITY[m[1]] + ' (' + m[2] + ')' : null; }],
    [/^(.+) ·$/, function (m) { return CITY[m[1]] ? CITY[m[1]] + ' ·' : null; }],
    [/^(.+): back to top to change city$/, function (m) { return city(m[1]) + ': 위로 가서 도시 바꾸기'; }],
    [/^☆ (\d+) saved events?$/, function (m) { return '☆ 저장한 이벤트 ' + m[1] + '개'; }],
    [/^(\d+) saved events?$/, function (m) { return '저장한 이벤트 ' + m[1] + '개'; }],
    [/^(Milonga|Práctica|Practica|Festival|Marathon|Event|Encuentro|Weekend|Workshop) (\d{4}\/\d{2}\/\d{2})$/, function (m) { return type(m[1]) + ' ' + m[2]; }],
    [/^WeChat Official Account: (.+)$/, function (m) { return '위챗 공식계정: ' + m[1]; }],
    [/^WeChat Channels: (.+)$/, function (m) { return '위챗 채널: ' + m[1]; }],
    [/^See upcoming events in (.+)$/, function (m) { return city(m[1]) + '의 다가오는 이벤트 보기'; }],
    [/^Coming up in (.+)$/, function (m) { return city(m[1]) + ' 다가오는 이벤트'; }],
    [/^(\d+)s until you can send again$/, function (m) { return m[1] + '초 후 다시 보낼 수 있습니다'; }],
    [/^Route pictures (\d+) \/ (\d+)$/, function (m) { return '찾아오는 길 사진 ' + m[1] + ' / ' + m[2]; }],
    [/^beta (\S+)$/, function (m) { return '베타 ' + m[1]; }],
    [/^(Ended|Event ended) · (.+)$/, function (m) { return '종료 · ' + m[2]; }]
  ];

  function tr(s) {
    var t = s.replace(/\s+/g, ' ').trim();
    if (!t || !/[A-Za-z]/.test(t)) return null;
    var v = S[t]; if (v == null && SE[t] != null && !/</.test(SE[t])) v = SE[t];
    if (v == null) {
      for (var i = 0; i < P.length && v == null; i++) { var m = P[i][0].exec(t); if (m) v = P[i][1](m); }
    }
    if (v == null || v === t) return null;
    var lead = /^\s*/.exec(s)[0], trail = /\s*$/.exec(s)[0];
    return lead + v + trail;
  }

  var SKIP = /^(SCRIPT|STYLE|TEXTAREA|INPUT|CODE|PRE|NOSCRIPT)$/;
  var ATTR = ['aria-label', 'placeholder', 'title', 'alt'];
  function skip(el) { for (; el && el !== D.body; el = el.parentNode) { if (el.nodeType === 1 && (SKIP.test(el.tagName) || el.hasAttribute('data-ko-skip') || (el.hasAttribute('lang') && el !== R && !/^ko/i.test(el.getAttribute('lang'))))) return true; } return false; }
  function doText(n) { if (!n.nodeValue || skip(n.parentNode)) return; var v = tr(n.nodeValue); if (v != null) n.nodeValue = v; }
  function doAttrs(el) { for (var i = 0; i < ATTR.length; i++) { var a = el.getAttribute && el.getAttribute(ATTR[i]); if (a) { var v = tr(a); if (v != null) el.setAttribute(ATTR[i], v); } } }
  function doEl(el) { if (!el.firstElementChild) return false; var t = (el.textContent || '').replace(/\s+/g, ' ').trim(); var v = SE[t]; if (v == null) return false; el.innerHTML = v; return true; }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1 || skip(root)) return;
    doAttrs(root); if (doEl(root)) return;
    var w = D.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) { if (n.nodeType === 3) doText(n); else { doAttrs(n); doEl(n); } }
  }

  var busy = false;
  var mo = new MutationObserver(function (list) {
    if (busy) return; busy = true;
    try {
      for (var i = 0; i < list.length; i++) {
        var r = list[i];
        if (r.type === 'childList') { if (r.addedNodes.length && r.target.nodeType === 1 && doEl(r.target)) continue; for (var j = 0; j < r.addedNodes.length; j++) walk(r.addedNodes[j]); }
        else if (r.type === 'characterData') doText(r.target);
        else if (r.type === 'attributes') { var a = r.target.getAttribute(r.attributeName); var v = a && tr(a); if (v != null) r.target.setAttribute(r.attributeName, v); }
      }
    } finally { mo.takeRecords(); busy = false; }
  });
  mo.observe(R, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR });
  /* 2026-11-15: Shiao's Korean notice has 3 paragraphs; a translation with a blank line becomes separate <p> */
  function splitNotice() { [].forEach.call(D.querySelectorAll('#atm-notice .atm-notice-body p'), function (p) { var t = p.textContent; if (t.indexOf('\n\n') < 0) return; var parts = t.split('\n\n'); p.textContent = parts[0]; for (var i = parts.length - 1; i > 0; i--) { var q = D.createElement('p'); q.textContent = parts[i]; p.parentNode.insertBefore(q, p.nextSibling); } }); }
  /* 2026-11-15 test version: the 한국어 menu link stays hidden; on a Korean page show English (and 中文) as the ways out. */
  function langMenu() {
    [].forEach.call(D.querySelectorAll('.top-lang a[data-asia-lang-set="en"][aria-current]'), function (a) { a.removeAttribute('aria-current'); a.setAttribute('href', a.getAttribute('href').replace(/[?&]lang=ko\b/, '') ); });
    [].forEach.call(D.querySelectorAll('.top-lang a[data-asia-lang-set="en"]'), function (a) { var h = a.getAttribute('href') || './'; if (!/[?&]lang=en\b/.test(h)) a.setAttribute('href', h + (h.indexOf('?') < 0 ? '?' : '&') + 'lang=en'); });
  }
  D.addEventListener('DOMContentLoaded', function () { busy = true; langMenu(); walk(D.body); splitNotice(); try { D.title = '아시아 탱고 지도 · Select Tango Weekend'; } catch (e) {} mo.takeRecords(); busy = false; });

  /* native dialogs */
  var oc = window.confirm; window.confirm = function (m) { return oc.call(window, tr(String(m)) || m); };
  var oa = window.alert; window.alert = function (m) { return oa.call(window, tr(String(m)) || m); };

  window.ATM_KO = { tr: tr, walk: walk };
})();
