/* atm-es.js v1 (2026-11-18): Spanish UI for the Asia Tango Map (copied from atm-ko.js).
   Loaded only when the visitor chose Spanish (asiaMapLang = es, ?lang=es, or a Spanish phone).
   The page runs as the English page; this file swaps the English UI words for Spanish.
   Event content follows the card's own *_es fields when they exist (atm-i18n.js, note_es in cardB/asia-map),
   otherwise English. Shiao 11/18: only mainland China cards get note_es for now.
   Exact-match only, so an event called "Milonga Cool" is never touched. */
(function () {
  var D = document, R = D.documentElement;
  if (!/^es/i.test(R.getAttribute('data-asia-lang') || R.lang || '')) return;
  var CITY = {
    'Shanghai': 'Shanghái', 'Beijing': 'Pekín', 'Tianjin': 'Tianjin', 'Guangzhou': 'Cantón', 'Qingdao': 'Qingdao',
    'Chengdu': 'Chengdu', 'Shenzhen': 'Shenzhen', 'Chongqing': 'Chongqing', 'Haikou': 'Haikou', 'Hangzhou': 'Hangzhou',
    "Xi'an": "Xi'an", 'Zhengzhou': 'Zhengzhou', 'Zhuhai': 'Zhuhai', 'Nanjing': 'Nankín', 'Suzhou': 'Suzhou', 'Wuhan': 'Wuhan',
    'Hong Kong': 'Hong Kong', 'Macau': 'Macao', 'Taiwan': 'Taiwán', 'Taipei': 'Taipéi', 'Moganshan': 'Moganshan', 'New Taipei': 'Nuevo Taipéi',
    'Taichung': 'Taichung', 'Tainan': 'Tainan', 'Hsinchu': 'Hsinchu', 'Zhubei': 'Zhubei', 'Miaoli': 'Miaoli',
    'Seoul': 'Seúl', 'Busan': 'Busan', 'Daegu': 'Daegu', 'Daejeon': 'Daejeon', 'Gwangju': 'Gwangju', 'Ulsan': 'Ulsan',
    'Changwon': 'Changwon', 'Cheongju': 'Cheongju', 'Gunsan': 'Gunsan', 'Jinju': 'Jinju', 'Pohang': 'Pohang',
    'Tokyo': 'Tokio', 'Osaka': 'Osaka', 'Singapore': 'Singapur', 'Kuala Lumpur': 'Kuala Lumpur', 'Penang': 'Penang',
    'Da Nang': 'Da Nang', 'Bandar Seri Begawan': 'Bandar Seri Begawan',
    'China': 'China', 'South Korea': 'Corea del Sur', 'Korea': 'Corea', 'Japan': 'Japón', 'Malaysia': 'Malasia',
    'Vietnam': 'Vietnam', 'Brunei': 'Brunéi', 'Others': 'Otros', 'Mainland China': 'China continental'
  };
  var TYPE = {
    'Milonga': 'Milonga', 'Práctica': 'Práctica', 'Practica': 'Práctica', 'Práctilonga': 'Practilonga', 'Practilonga': 'Practilonga',
    'Festival': 'Festival', 'Marathon': 'Maratón', 'Encuentro': 'Encuentro', 'Weekend': 'Fin de semana',
    'Encuentro / Weekend': 'Encuentro / Fin de semana', 'Anniversary': 'Milonga aniversario', 'Workshop': 'Taller', 'Group Trip': 'Viaje en grupo',
    'Championship': 'Campeonato', 'Event': 'Evento', 'Class': 'Clase', 'One-off': 'Única vez',
    'Weekly': 'Semanal', 'Monthly': 'Mensual', 'Biweekly': 'Quincenal'
  };
  var WD = { Sun: 'dom', Mon: 'lun', Tue: 'mar', Wed: 'mié', Thu: 'jue', Fri: 'vie', Sat: 'sáb' };
  var WDL = { Sunday: 'domingo', Monday: 'lunes', Tuesday: 'martes', Wednesday: 'miércoles', Thursday: 'jueves', Friday: 'viernes', Saturday: 'sábado' };
  /* plural, for "todos los …" */
  var WDP = { Sun: 'domingos', Mon: 'lunes', Tue: 'martes', Wed: 'miércoles', Thu: 'jueves', Fri: 'viernes', Sat: 'sábados',
    Sunday: 'domingos', Monday: 'lunes', Tuesday: 'martes', Wednesday: 'miércoles', Thursday: 'jueves', Friday: 'viernes', Saturday: 'sábados' };
  var NTH = { '1st': '1.er', '2nd': '2.º', '3rd': '3.er', '4th': '4.º', '5th': '5.º', 'Last': 'último' };
  /* 11/22 (month/day) -> 22/11, the order Spanish readers expect */
  function dm(s) { var m = /^(\d{1,2})\/(\d{1,2})$/.exec(s); return m ? m[2] + '/' + m[1] : s; }

  var S = {
    /* header, tabs, home */
    'Asia Tango Map': 'Mapa de Tango de Asia', 'Add event': 'Añadir evento', 'Saved': 'Guardados', 'Regular': 'Habituales', 'Special': 'Especiales',
    'Filter': 'Filtrar', 'See all ›': 'Ver todo ›', 'Month': 'Mes', 'Week': 'Semana', 'Today': 'Hoy', 'From today': 'Desde hoy',
    'by date': 'por fecha', 'From today · by date': 'Desde hoy · por fecha', 'Upcoming special': 'Próximos eventos especiales',
    'Other cities': 'Otras ciudades', 'All regular': 'Todos los habituales', 'All special': 'Todos los especiales', 'Special events': 'Eventos especiales',
    'Regular events': 'Eventos habituales', 'regular events': 'eventos habituales', 'regular event': 'evento habitual',
    'special event': 'evento especial', 'Mainland China · weekly · pick a city': 'China continental · semanal · elige una ciudad',
    'Choose events': 'Elegir eventos', 'All events': 'Todos los eventos', 'All cities': 'Todas las ciudades', 'All events · All cities': 'Todos los eventos · Todas las ciudades',
    'events': 'eventos', 'Events': 'Eventos', 'Collapse': 'Contraer', 'Expand': 'Desplegar', 'No events': 'Sin eventos',
    'No events found': 'No se encontraron eventos', 'Clear filters': 'Quitar filtros', 'Finding milongas…': 'Buscando milongas…',
    'No saved events yet. Tap the star on an event to save it.': 'Todavía no guardaste eventos. Toca la estrella de un evento para guardarlo.',
    'Tap the star on an event to save it.': 'Toca la estrella de un evento para guardarlo.',
    'Tap ☆ on an event to save it here': 'Toca ☆ en un evento para guardarlo aquí',
    'After you verify your email, this list restores on your other devices': 'Después de verificar tu correo, esta lista aparece también en tus otros dispositivos',
    'Festivals': 'Festivales', 'Marathons': 'Maratones', 'Encuentros / Weekends': 'Encuentros / Fines de semana', 'Anniversaries': 'Milongas aniversario',
    'Workshops': 'Talleres', 'Group Trips': 'Viajes en grupo', 'Last': 'Último', 'Cancelled': 'Cancelado', 'Paused this week': 'No hay esta semana',
    'Remove from favorites': 'Quitar de guardados', 'Add to favorites': 'Guardar', 'Save': 'Guardar', 'Next': 'Siguiente',
    'Saved events': 'Eventos guardados', 'Choose city': 'Elegir ciudad', 'Choose a city': 'Elige una ciudad', 'Select a city': 'Elige una ciudad',
    'Later dates are projected from the weekly schedule and may change. Please confirm with the organizer.': 'Las fechas siguientes se calculan a partir del horario semanal y pueden cambiar. Confírmalas con el organizador.',
    'Favorites': 'Guardados', 'FAVORITES': 'GUARDADOS', 'My saved events': 'Mis eventos guardados', 'Recommended': 'Recomendados', 'RECOMMENDED': 'RECOMENDADOS',
    'Weekly milongas & practicas': 'Milongas y prácticas semanales', '— Weekly milongas & practicas': '— Milongas y prácticas semanales',
    'No events match these filters in this city.': 'No hay eventos con estos filtros en esta ciudad.',
    'No listings match these filters.': 'No hay eventos con estos filtros.', 'All cities · Special events by start date': 'Todas las ciudades · Eventos especiales por fecha de inicio',
    'Weekly milonga · This week\'s theme': 'Milonga semanal · Tema de esta semana', 'TBA': 'Por confirmar',
    /* card */
    'Preview': 'Anuncio', 'Details to be announced': 'Detalles por anunciar', 'Preview · Details to be announced': 'Anuncio · Detalles por anunciar', 'Venue to be announced': 'Lugar por anunciar', 'Venue': 'Lugar', 'Destination': 'Destino', 'ORG': 'ORG', 'Info': 'Información', 'please check with the organizer': 'confírmalo de nuevo con el organizador', 'Not updated for a long time; it may have stopped': 'Sin actualizar desde hace tiempo; puede que ya no se haga', 'Contact info not yet available; best to check with local dancers before going': 'Aún sin datos de contacto; mejor consulta con bailarines locales antes de ir', 'Organizer': 'Organizador', 'Address': 'Dirección', 'City': 'Ciudad', 'Time': 'Horario', 'Fee': 'Entrada',
    'Notes': 'Notas', 'Note': 'Nota', 'Notice': 'Aviso', 'Notice ›': 'Aviso ›', 'More': 'Más', 'Less': 'Menos', 'Collapse ⌃': 'Contraer ⌃',
    'Links': 'Enlaces', 'Website': 'Sitio web', 'Event website': 'Sitio del evento', 'Video': 'Video', 'Register': 'Inscribirse',
    'Details': 'Detalles', 'Event details': 'Detalles del evento', 'Phone': 'Teléfono', 'Email': 'Correo', 'WeChat': 'WeChat',
    'WeChat ID:': 'ID de WeChat:', 'Phone:': 'Teléfono:', 'Email:': 'Correo:', 'Phone/WeChat:': 'Teléfono/WeChat:',
    'WeChat Article': 'Artículo de WeChat', 'WeChat article': 'Artículo de WeChat', 'Temporarily changed': 'Cambio temporal', 'New notice': 'Aviso nuevo',
    'Same venue': 'Mismo lugar', 'Weekly classes too ›': 'También clases semanales ›',
    'Newer poster': 'Afiche más nuevo', 'Older poster': 'Afiche anterior', 'Past poster': 'Afiche pasado', 'Previous poster': 'Afiche anterior', 'Next poster': 'Afiche siguiente',
    'ENDED': 'TERMINADO', 'This event has ended': 'Este evento ya terminó', 'View all events': 'Ver todos los eventos', 'Next edition:': 'Próxima edición:',
    '📷 Recap': '📷 Resumen', 'Photos:': 'Fotos:', '★ Special events': '★ Eventos especiales', 'This card is not on the map': 'Esta ficha no está en el mapa',
    'The map could not load this card. That does not mean the event has ended.': 'El mapa no pudo cargar esta ficha. Eso no significa que el evento haya terminado.',
    'Try again': 'Reintentar', 'Back': 'Atrás', 'Back to list': 'Volver a la lista', 'Search': 'Buscar', 'Menu': 'Menú', 'Close': 'Cerrar', 'Map ↗': 'Mapa ↗', 'Enlarge': 'Ampliar', 'Show this to a driver': 'Mostrar al conductor', 'Open map': 'Abrir mapa', 'Copy address': 'Copiar dirección', 'Copied': 'Copiado', 'Route pictures': 'Fotos del recorrido', 'Directions': 'Cómo llegar',
    'No · Not confirmed, please contact the organizer': 'No · Sin confirmar, consulta al organizador',
    'Viewed': 'Vistos', 'Recently viewed': 'Vistos recientemente', 'Hide': 'Ocultar', 'Show': 'Mostrar', 'Clear': 'Borrar',
    /* menu */
    'Sources': 'Fuentes', 'Contact': 'Contacto', 'Email us': 'Escríbenos', 'Subscribe': 'Suscribirse', 'Submit event': 'Enviar evento',
    'Share': 'Compartir', 'Copy link': 'Copiar enlace', 'Refresh': 'Actualizar', 'My ATM': 'Mi ATM', 'About': 'Acerca de', 'My profile': 'Mi perfil', 'Subscription & account': 'Suscripción y cuenta',
    'Cancel': 'Cancelar', 'More actions': 'Más acciones', 'Language': 'Idioma',
    /* notice */
    'Beta Notice & Disclaimer': 'Aviso de versión beta y descargo de responsabilidad',
    'Asia Tango Map (ATM) is still in beta. Event information may be inaccurate or out of date.': 'Asia Tango Map (ATM) todavía está en versión beta. La información de los eventos puede ser inexacta o no estar actualizada.',
    'Before attending, please confirm the date, time, venue, itinerary and registration arrangements directly with the organizer before making travel plans or payments. The organizer’s latest confirmation takes precedence. This site provides information for reference only; saving an event or selecting Going / Interested is not a formal registration.': 'Antes de asistir, de viajar o de pagar, confirma directamente con el organizador la fecha, el horario, el lugar, el programa y la forma de inscripción. Vale siempre la última confirmación del organizador.\n\nLa información de este sitio es solo de referencia; guardar un evento o elegir «Voy» o «Me interesa» no es una inscripción formal.',
    'I understand, enter the site': 'Entendido, entrar al sitio',
    /* submit-event form */
    'Event name': 'Nombre del evento', 'Date': 'Fecha', 'Your email': 'Tu correo', '(Required)': '(Obligatorio)', 'required': 'obligatorio',
    'Your WeChat ID': 'Tu ID de WeChat', 'Submit': 'Enviar', 'Thank you': 'Gracias', 'One-time or regular': 'Única vez o habitual',
    'State one-time or regular; for regular, give the frequency, e.g. weekly or monthly': 'Indica si es única vez o habitual; si es habitual, la frecuencia (por ejemplo, semanal o mensual)',
    'Event info compiled from WeChat and Facebook, with reference to': 'Información de eventos recopilada de WeChat y Facebook, con referencia a',
    '. Please check the organizer\'s latest announcement for times and details.': '. Consulta el último anuncio del organizador para horarios y detalles.',
    /* star / going */
    'Going': 'Voy', '✓ Going': '✓ Voy', 'Interested': 'Me interesa', 'Not Going': 'No voy', 'Withdraw': 'Retirar', 'Keep': 'Mantener', 'Confirm': 'Confirmar',
    'Saved. Find it under Saved.': 'Guardado. Lo encuentras en «Guardados».',
    'Want a note when these events change or registration closes?': '¿Quieres un aviso cuando estos eventos cambien o cierre la inscripción?', 'No thanks': 'No, gracias', 'Get special-event news': 'Recibir novedades de eventos especiales', 'New festivals, marathons and registration deadlines, sent now and then': 'Nuevos festivales, maratones y cierres de inscripción, de vez en cuando',
    'Saved. This one is not sent to the organizer.': 'Guardado. Esto no se envía al organizador.',
    'Remove this event from favorites?': '¿Quitar este evento de guardados?',
    'Not a ticket or a formal registration.': 'No es una entrada ni una inscripción formal.',
    'In testing. Later the organizer will get your name. This is not a booking or ticket.': 'En prueba. Más adelante el organizador recibirá tu nombre. No es una reserva ni una entrada.',
    'Going is not a ticket or a formal registration.': '«Voy» no es una entrada ni una inscripción formal.',
    'Get early-bird, deadline and organizer notices for this event': 'Recibir avisos de preventa, cierres y del organizador de este evento',
    'First time: enter your email and the last 4 digits of your mobile, then tap the link in the confirmation email. After that, the same two fields sign you in.': 'La primera vez: escribe tu correo y los últimos 4 dígitos de tu móvil, y toca el enlace del correo de confirmación. Después, con esos mismos dos datos inicias sesión.',
    /* 2026-11-24: Google sign-in (atm-google.js) */
    'Continuing with Google also joins the ATM site-wide subscription. You can unsubscribe anytime.': 'Si continúas con Google, también te suscribes a las noticias de todo ATM. Puedes darte de baja cuando quieras.',
    'or use your email and mobile last 4 digits': 'o usa tu email y los últimos 4 dígitos de tu móvil',
    'Signed in with Google and joined the ATM site-wide subscription.': 'Has entrado con Google y te has suscrito a las noticias de todo ATM.',
    'Signed in with Google.': 'Has entrado con Google.',
    'Google sign-in did not work. Please try again, or use your email.': 'No se pudo entrar con Google. Inténtalo de nuevo o usa tu email.',
    'With Google you skip the mobile digits and the confirmation email.': 'Con Google no necesitas los dígitos del móvil ni el email de confirmación.',
    'Complete your details and send the confirmation email. Tap the link in it and you’re done.': 'Completa tus datos y envía el correo de confirmación. Toca el enlace del correo y listo.',
    'Event news': 'Novedades de eventos',
    'The confirmation link may open in another browser. After confirming, come back here (e.g. WeChat) and sign in with the same email and last 4 digits.': 'El enlace de confirmación puede abrirse en otro navegador. Después de confirmar, vuelve aquí (por ejemplo, a WeChat) e inicia sesión con el mismo correo y los últimos 4 dígitos.',
    'Event news now and then, mostly special events. Unsubscribe any time.': 'Novedades de vez en cuando, sobre todo de eventos especiales. Puedes darte de baja cuando quieras.',
    'Going to an event? On its page choose Going or Interested, and the organizer can tell you about early-bird prices, deadlines and directions.': '¿Vas a ir a un evento? En su página elige «Voy» o «Me interesa», y el organizador podrá avisarte de precios de preventa, cierres de inscripción y cómo llegar.', 'Directions (optional)': 'Cómo llegar (opcional)',
    'Get early-bird deadlines, directions and updates from the organizer.': 'Recibe del organizador los cierres de preventa, cómo llegar y las novedades.',
    'Choose Going, Interested, or Not Going.': 'Elige «Voy», «Me interesa» o «No voy».',
    'Confirm your email first. Your intent is saved when you confirm.': 'Primero confirma tu correo. Tu elección se guarda al confirmar.',
    'All fields are required': 'Todos los campos son obligatorios',
    'After one verification on this device, you won’t need to verify again to choose Going or Interested.': 'Después de verificar una vez en este dispositivo, no tendrás que volver a hacerlo para elegir «Voy» o «Me interesa».',
    'Confirmation email sent. Your intent is saved when you confirm.': 'Correo de confirmación enviado. Tu elección se guarda al confirmar.',
    'Email sent — please confirm in your inbox': 'Correo enviado: confírmalo en tu bandeja de entrada',
    'Didn\'t get the email? Check your spam or junk folder.': '¿No te llegó el correo? Revisa la carpeta de spam o correo no deseado.',
    'Check your spam folder first. You can resend once after 1 minute.': 'Primero revisa la carpeta de spam. Puedes reenviarlo una vez después de 1 minuto.',
    'Already resent. Please check your inbox, or try again later.': 'Ya se reenvió. Revisa tu bandeja de entrada o inténtalo más tarde.',
    'Resend verification email': 'Reenviar correo de verificación', 'Email confirmed. Your intent is saved.': 'Correo confirmado. Tu elección quedó guardada.',
    'Email verified. Profile saved. Use the star on an event to choose Going or Interested.': 'Correo verificado. Perfil guardado. Usa la estrella de un evento para elegir «Voy» o «Me interesa».',
    'Saved. The organizer will be notified.': 'Guardado. Se avisará al organizador.', 'Saved. The organizer email was not found.': 'Guardado. No se encontró el correo del organizador.',
    'RSVP unavailable. Please contact the organizer.': 'No se puede confirmar asistencia aquí. Consulta al organizador.',
    'Saved. The notification failed to send.': 'Guardado. No se pudo enviar el aviso.',
    'Please complete city, role, and any missing fields. No need to re-verify the same email.': 'Completa la ciudad, el rol y los campos que falten. No hace falta volver a verificar el mismo correo.',
    'Cancel intent': 'Cancelar elección', 'Cancel this intent? We will not email the organizer again, and mail already sent is not recalled.': '¿Cancelar esta elección? No volveremos a escribir al organizador, y el correo ya enviado no se puede retirar.',
    'Intent cancelled. No new email was sent to the organizer.': 'Elección cancelada. No se envió ningún correo nuevo al organizador.',
    'Email confirmed': 'Correo confirmado', 'Unsubscribe from this event’s updates (keeps your Going / Interested)': 'Dejar de recibir novedades de este evento (se mantiene tu «Voy» / «Me interesa»)',
    'Date (Beijing time, UTC+8)': 'Fecha (hora de Pekín, UTC+8)', 'No event intents yet.': 'Todavía no elegiste ningún evento.',
    'Organizer email not available yet': 'Todavía no tenemos el correo del organizador', 'Checking organizer email': 'Comprobando el correo del organizador',
    'Finish the human check, then tap Confirm.': 'Completa la verificación humana y luego toca «Confirmar».', 'Finish the human check, then send.': 'Completa la verificación humana y luego envía.',
    'The check did not finish. Wait a moment and try again.': 'La verificación no terminó. Espera un momento e inténtalo de nuevo.',
    'The check expired. Wait until it finishes, then try again.': 'La verificación caducó. Espera a que termine e inténtalo de nuevo.',
    'The check timed out. Please try again.': 'Se agotó el tiempo de la verificación. Inténtalo de nuevo.',
    'The check was not accepted. Wait until it finishes, then try again.': 'La verificación no fue aceptada. Espera a que termine e inténtalo de nuevo.',
    'Network error. Please try again.': 'Error de red. Inténtalo de nuevo.', 'This did not go through. Please try again.': 'No se pudo completar. Inténtalo de nuevo.',
    'Please try again later.': 'Inténtalo más tarde.', 'Too many confirmation emails. Please try again later.': 'Demasiados correos de confirmación. Inténtalo más tarde.',
    'Event intent': 'Elección del evento', 'Manage intent': 'Gestionar elección', 'Intent saved': 'Elección guardada',
    'Tap the star to choose Going or Interested. It shows here after you verify your email.': 'Toca la estrella para elegir «Voy» o «Me interesa». Aparecerá aquí después de verificar tu correo.',
    /* subscribe / sign in */
    'Name': 'Nombre', 'Your name': 'Tu nombre', 'Your city': 'Tu ciudad',
    'Role': 'Rol', 'Choose': 'Elegir', 'Leader': 'Líder', 'Follower': 'Seguidor/a', 'Both': 'Ambos',
    'Please enter your name.': 'Escribe tu nombre.', 'Please enter your city.': 'Escribe tu ciudad.',
    'Please choose Leader, follower, or both.': 'Elige líder, seguidor/a o ambos.', 'Join ATM site-wide subscription': 'Suscribirme a las novedades de ATM',
    'Please enter your email.': 'Escribe tu correo.', 'Please check your email address.': 'Revisa tu dirección de correo.',
    'We couldn’t send the verification email. Check the address or try again.': 'No pudimos enviar el correo de verificación. Revisa la dirección o inténtalo de nuevo.',
    'Already subscribed? Enter your email and the last 4 digits of your mobile. You don’t need another confirmation email.': '¿Ya estás suscrito? Escribe tu correo y los últimos 4 dígitos de tu móvil. No necesitas otro correo de confirmación.',
    'Mobile number': 'Número de móvil', 'Mobile last 4 digits': 'Últimos 4 dígitos del móvil', 'Sign in': 'Iniciar sesión', 'Signing in…': 'Iniciando sesión…',
    ' (optional)': ' (opcional)', '(optional)': '(opcional)', 'Check your email': 'Revisa tu correo', 'Confirmation email sent to:': 'Correo de confirmación enviado a:',
    'Open your email. Not there? Check spam or junk.': 'Abre tu correo. ¿No está? Revisa spam o correo no deseado.', 'Tap Confirm in the email.': 'Toca «Confirmar» en el correo.',
    'Tap Confirm in the email, or enter its 6-digit code below.': 'Toca «Confirmar» en el correo o escribe abajo su código de 6 dígitos.',
    'Come back to this page. You’ll be signed in automatically.': 'Vuelve a esta página. La sesión se iniciará automáticamente.',
    '6-digit code': 'Código de 6 dígitos', 'Sign in with code': 'Entrar con el código', 'That code is not right.': 'Ese código no es correcto.',
    'The code has expired. Please send again.': 'El código caducó. Vuelve a enviarlo.', 'Too many wrong codes. Please send again.': 'Demasiados códigos incorrectos. Vuelve a enviarlo.',
    'Didn’t get it? Send again': '¿No te llegó? Volver a enviar', 'Confirmed? Sign in': '¿Ya confirmaste? Iniciar sesión',
    'After you tap the confirmation link, your email and the last 4 digits sign you in.': 'Después de tocar el enlace de confirmación, inicias sesión con tu correo y los últimos 4 dígitos.',
    'No human check showing? It may be the network. Turn off VPN, or switch Wi-Fi / mobile data, then reopen this page.': '¿No aparece la verificación humana? Puede ser la red. Desactiva la VPN o cambia entre wifi y datos móviles, y vuelve a abrir esta página.',
    'Or enter the 6-digit code from the email': 'O escribe el código de 6 dígitos del correo',
    'Register / sign in': 'Registrarse / iniciar sesión', 'Send confirmation email': 'Enviar correo de confirmación', 'Send verification email': 'Enviar correo de verificación',
    'Please enter your phone number.': 'Escribe tu número de teléfono.', 'That phone number does not look valid.': 'Ese número de teléfono no parece válido.',
    'Enter the last 4 digits of your mobile.': 'Escribe los últimos 4 dígitos de tu móvil.', 'The email or the mobile last 4 digits did not match.': 'El correo o los últimos 4 dígitos del móvil no coinciden.',
    'Saving…': 'Guardando…', 'Unsubscribe': 'Darse de baja', 'Sending…': 'Enviando…', 'Confirmed': 'Confirmado',
    'Profile saved. This device is already verified, so no new email was sent.': 'Perfil guardado. Este dispositivo ya está verificado, así que no se envió un correo nuevo.',
    'Something went wrong. Please try again later.': 'Algo salió mal. Inténtalo más tarde.', 'Too many tries. Please try again later.': 'Demasiados intentos. Inténtalo más tarde.',
    'My subscription': 'Mi suscripción', 'Copy': 'Copiar', 'New link': 'Nuevo enlace', 'A new link stops the old one. Continue?': 'Un enlace nuevo anula el anterior. ¿Continuar?',
    'Open this link in WeChat, Safari, Chrome, or another browser to sign in. No new confirmation email.': 'Abre este enlace en WeChat, Safari, Chrome u otro navegador para iniciar sesión. No llega otro correo de confirmación.',
    'This browser does not have the link saved. A new link stops the old one.': 'Este navegador no tiene el enlace guardado. Un enlace nuevo anula el anterior.',
    'The link saved in this browser no longer works. You can make a new one.': 'El enlace guardado en este navegador ya no funciona. Puedes crear uno nuevo.',
    'The subscription link could not be loaded. Try again later.': 'No se pudo cargar el enlace de suscripción. Inténtalo más tarde.',
    /* how-to, intro, push */
    'Find tango in 3 steps': 'Encuentra tango en 3 pasos', 'Got it': 'Entendido', 'Asia Tango Map — find Argentine tango across Asia': 'Mapa de Tango de Asia: encuentra tango argentino en toda Asia',
    '— find Argentine tango across Asia': '— encuentra tango argentino en toda Asia', 'Milongas, festivals & marathons near you': 'Milongas, festivales y maratones cerca de ti',
    '🔔 Turn on push alerts': '🔔 Activar notificaciones', '🔕 Turn off push alerts': '🔕 Desactivar notificaciones', 'Working…': 'Procesando…',
    'Push alerts are off.': 'Las notificaciones están desactivadas.', 'This browser does not support push notifications.': 'Este navegador no admite notificaciones push.',
    'Could not turn on push alerts. Please try again later.': 'No se pudieron activar las notificaciones. Inténtalo más tarde.',
    /* lowercase type label on special-event cards */
    'workshop': 'taller', 'group trip': 'viaje en grupo', 'marathon': 'maratón', 'festival': 'festival', 'weekend': 'fin de semana', 'anniversary': 'aniversario', 'championship': 'campeonato', 'practica': 'práctica',
    'None yet': 'Todavía no hay', 'prev': 'anterior', 'next': 'siguiente',
    'Sun': 'dom', 'Mon': 'lun', 'Tue': 'mar', 'Wed': 'mié', 'Thu': 'jue', 'Fri': 'vie', 'Sat': 'sáb',
    'Sunday': 'domingo', 'Monday': 'lunes', 'Tuesday': 'martes', 'Wednesday': 'miércoles', 'Thursday': 'jueves', 'Friday': 'viernes', 'Saturday': 'sábado'
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
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  var P = [
    [/^New notice · (\d{1,2}\/\d{1,2})( [›⌃])?$/, function (m) { return 'Aviso nuevo · ' + dm(m[1]) + (m[2] || ''); }],
    [/^More from (.+)$/, function (m) { return 'Más de ' + m[1]; }],
    [/^All of (.+) ›$/, function (m) { return 'Todo de ' + m[1] + ' ›'; }],
    [/^Updated (today|yesterday|(\d+) days ago|(\d{2}\/\d{2}|\d{4}\/\d{2}\/\d{2}))$/, function (m) { return 'Actualizado ' + (m[1] === 'today' ? 'hoy' : m[1] === 'yesterday' ? 'ayer' : m[2] ? 'hace ' + m[2] + ' días' : 'el ' + m[3]); }],
    [/^Confirmed by organizer (today|yesterday|(\d+) days ago)$/, function (m) { return 'Confirmado por el organizador ' + (m[1] === 'today' ? 'hoy' : m[1] === 'yesterday' ? 'ayer' : 'hace ' + m[2] + ' días'); }],
    [new RegExp('^(Today · )?(' + WDK + ') (\\d{1,2}/\\d{1,2})$'), function (m) { return (m[1] ? 'Hoy · ' : '') + WD[m[2]] + ' ' + dm(m[3]); }],
    [new RegExp('^(' + WDLK + ') (\\d{1,2}/\\d{1,2})$'), function (m) { return cap(WDL[m[1]]) + ' ' + dm(m[2]); }],
    [new RegExp('^Every other (' + WDK + '|' + WDLK + ')\\b(.*)$'), function (m) { return cap(WDP[m[1]]) + ' alternos' + tail(m[2]); }],
    [new RegExp('^Every (' + WDK + '|' + WDLK + ')\\b(.*)$'), function (m) { return 'Todos los ' + WDP[m[1]] + tail(m[2]); }],
    [new RegExp('^((?:1st|2nd|3rd|4th|5th|Last)(?:(?: & |, | and )(?:1st|2nd|3rd|4th|5th|Last))*) (' + WDLK + ')(?: of the month)?( .*)?$'), function (m) {
      return cap(m[1].split(/ & |, | and /).map(function (x) { return NTH[x]; }).join(' y ')) + ' ' + WDL[m[2]] + ' de cada mes' + (m[3] ? ' · ' + type(m[3].trim()) : ''); }],
    [/^(Weekly|Monthly|Biweekly|One-off) · (.+)$/, function (m) { return TYPE[m[1]] + ' · ' + type(m[2]); }],
    [/^([\d/–:\- ]+) · (.+) departure$/, function (m) { return m[1] + ' · salida desde ' + city(m[2]); }],
    [/^([\d/–:\- ]+) · (.+)$/, function (m) { return m[1] + ' · ' + tail(m[2]).split(' · ').map(type).join(' · '); }],
    [/^Upcoming special · (.+)$/, function (m) { return 'Próximos eventos especiales · ' + city(m[1]); }],
    [/^(.+) ▾$/, function (m) { return CITY[m[1]] ? CITY[m[1]] + ' ▾' : null; }],
    [/^(.+) \((\d+)\)$/, function (m) { return CITY[m[1]] ? CITY[m[1]] + ' (' + m[2] + ')' : null; }],
    [/^(.+) ·$/, function (m) { return CITY[m[1]] ? CITY[m[1]] + ' ·' : null; }],
    [/^(.+): back to top to change city$/, function (m) { return city(m[1]) + ': vuelve arriba para cambiar de ciudad'; }],
    [/^☆ (\d+) saved events?$/, function (m) { return '☆ ' + m[1] + (m[1] === '1' ? ' evento guardado' : ' eventos guardados'); }],
    [/^(\d+) saved events?$/, function (m) { return m[1] + (m[1] === '1' ? ' evento guardado' : ' eventos guardados'); }],
    [/^(Milonga|Práctica|Practica|Festival|Marathon|Event|Encuentro|Weekend|Workshop|Anniversary|Group Trip) (\d{4}\/\d{2}\/\d{2}(?:–(?:\d{4}\/)?\d{2}\/\d{2})?)$/, function (m) { return type(m[1]) + ' ' + m[2]; }],
    [/^WeChat ID: (.+)$/, function (m) { return 'ID de WeChat: ' + m[1]; }],
    [/^WeChat Official Account: (.+)$/, function (m) { return 'Cuenta oficial de WeChat: ' + m[1]; }],
    [/^WeChat Channels: (.+)$/, function (m) { return 'Canales de WeChat: ' + m[1]; }],
    [/^See upcoming events in (.+)$/, function (m) { return 'Ver próximos eventos en ' + city(m[1]); }],
    [/^Coming up in (.+)$/, function (m) { return 'Próximamente en ' + city(m[1]); }],
    [/^(\d+)s until you can send again$/, function (m) { return 'Podrás volver a enviar en ' + m[1] + ' s'; }],
    [/^Route pictures (\d+) \/ (\d+)$/, function (m) { return 'Fotos del recorrido ' + m[1] + ' / ' + m[2]; }],
    [/^beta (\S+)$/, function (m) { return 'beta ' + m[1]; }],
    [/^(Ended|Event ended) · (.+)$/, function (m) { return 'Terminado · ' + m[2]; }]
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
  function skip(el) { for (; el && el !== D.body; el = el.parentNode) { if (el.nodeType === 1 && (SKIP.test(el.tagName) || el.hasAttribute('data-ko-skip') || (el.hasAttribute('lang') && el !== R && !/^es/i.test(el.getAttribute('lang'))))) return true; } return false; }
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
  /* a translation with a blank line becomes separate <p> */
  function splitNotice() { [].forEach.call(D.querySelectorAll('#atm-notice .atm-notice-body p'), function (p) { var t = p.textContent; if (t.indexOf('\n\n') < 0) return; var parts = t.split('\n\n'); p.textContent = parts[0]; for (var i = parts.length - 1; i > 0; i--) { var q = D.createElement('p'); q.textContent = parts[i]; p.parentNode.insertBefore(q, p.nextSibling); } }); }
  /* On a Spanish page the English link must say ?lang=en, or the saved choice (es) would bring the visitor straight back to Spanish. */
  function langMenu() {
    [].forEach.call(D.querySelectorAll('.top-lang a[data-asia-lang-set="en"][aria-current]'), function (a) { a.removeAttribute('aria-current'); a.setAttribute('href', a.getAttribute('href').replace(/[?&]lang=es\b/, '') ); });
    [].forEach.call(D.querySelectorAll('.top-lang a[data-asia-lang-set="en"]'), function (a) { var h = a.getAttribute('href') || './'; if (!/[?&]lang=en\b/.test(h)) a.setAttribute('href', h + (h.indexOf('?') < 0 ? '?' : '&') + 'lang=en'); });
  }
  D.addEventListener('DOMContentLoaded', function () { busy = true; langMenu(); walk(D.body); splitNotice(); try { D.title = 'Mapa de Tango de Asia · Select Tango Weekend'; } catch (e) {} mo.takeRecords(); busy = false; });

  /* native dialogs */
  var oc = window.confirm; window.confirm = function (m) { return oc.call(window, tr(String(m)) || m); };
  var oa = window.alert; window.alert = function (m) { return oa.call(window, tr(String(m)) || m); };

  window.ATM_ES = { tr: tr, walk: walk };
})();
