const urlCheck = () => {
  // 'MTI3LjAuMC4x' // '127.0.0.1'
  // 'c3RhcnR1cC1mYWN0b3J5LmNvLmty' // 'startup-factory.co.kr'
  // 'c2VhcmNoLWZpbmRpZnkuY29t' // 'kr.search-findify.com'
  // 'NzU1Njc4MzIudGlzdG9yeS5jb20=' // '75567832.tistory.com
  const allowURLs = ['MTI3LjAuMC4x', 'c3RhcnR1cC1mYWN0b3J5LmNvLmty', 'c2VhcmNoLWZpbmRpZnkuY29t', 'NzU1Njc4MzIudGlzdG9yeS5jb20='];
  let result = false;

  allowURLs.map((url) => {
    if (window.location.host.includes(atob(url))) {
      if (!result) {
        result = true;
      }
    }
  });

  if (!result) {
    $('head').remove();
    $(function () {
      $('body').html('허용되지 않은 접근입니다.');
    })
  }

  return result;
}

urlCheck();

var pushState = history.pushState;
var replaceState = history.replaceState;

const requestURL = [];
let page = 0;

const hideImage = (img) => {
  $(img).remove();
}

const putSiteName = (keyelem, label, host) => {
  if ($('.gsc-richsnippet-individual-snippet-keyelem').length === 0) {
    label.closest('.gsc-webResult.gsc-result').find('.txt-site-name').text(host)
  }

  if (keyelem.text().includes('ogSiteName')) {
    label.closest('.gsc-webResult.gsc-result').find('.txt-site-name').text(keyelem.parent().find('.gsc-richsnippet-individual-snippet-valueelem').text())
  } else if (keyelem.text().includes('applicationName')) {
    label.closest('.gsc-webResult.gsc-result').find('.txt-site-name').text(keyelem.parent().find('.gsc-richsnippet-individual-snippet-valueelem').text())
  } else if (label.closest('.gsc-webResult.gsc-result').find('a.gs-title').text().split('|').length > 1) {
    const siteName = label.closest('.gsc-webResult.gsc-result').find('a.gs-title').text().split('|').pop();
    label.closest('.gsc-webResult.gsc-result').find('.txt-site-name').text(siteName)
  } else {
    label.closest('.gsc-webResult.gsc-result').find('.txt-site-name').text(host)
  }
}

const putFavicon = async (keyelem, label, host) => {
  const faviconBox = label.closest('.gsc-webResult.gsc-result').find('.box-favicon')

  if (keyelem.text().includes('msapplicationTileimage') || keyelem.text().includes('naverblogProfileImage')) {
    const url = keyelem.parent().find('.gsc-richsnippet-individual-snippet-valueelem').text();
    faviconBox.prepend(`<img class="img-favicon msapplication" src="${url}" alt="favicon" class="favicon" onerror="hideImage(this)">`)
    requestURL.push(host);
  } else if (faviconBox.find('.img-favicon.msapplication').length === 0 &&
    requestURL.indexOf(host) === -1) {
    requestURL.push(host);
    host = host.replace('https://', '').replace('http://', '').replaceAll('../', '').replaceAll('www.', '');
    const url = "https://icon.horse/icon/" + host
    label.closest('.gsc-webResult.gsc-result').find('.box-favicon').prepend(`<img class="img-favicon" src="${url}" alt="favicon" class="favicon" onerror="hideImage(this)">`)
  }
}

const putOgData = (length) => {
  for (let i = 0; i < length; i++) {
    const label = $('.gsc-richsnippet-showsnippet-label').eq(i);
    label.click();

    const fullURL = $('.gsc-richsnippet-popup-box-title-url').text();
    const host = new URL(fullURL).origin;

    label.closest('.gsc-webResult.gsc-result').prepend('<div class="box-og"><div class="box-favicon"><svg focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"></path></svg></div><div class="box-txt"><p class="txt-site-name"> </p><div class="box-url"></div></div></div>')
    const url = label.closest('.gsc-webResult.gsc-result').find('.gsc-url-top');
    const urlClone = url.clone();
    label.closest('.gsc-webResult.gsc-result').find('.box-url').append(urlClone);
    url.remove();


    $('.gsc-richsnippet-individual-snippet-keyelem').each(function () {
      putFavicon($(this), label, host);
      putSiteName($(this), label, host);
    })
  }
}

const putSponsorCSS = async () => {
  if ($('.gsc-adBlock').length > 0) {

    const css = await $.ajax({
      url: 'styles.css',
    });

    $('iframe').each((function () {
      $(this).on('load', function () {
        const iframeDoc = $(this).contents();
        const style = document.createElement('style');
        style.textContent = css;
        iframeDoc.find('head').append(style);
      });
    }))
  }
}

history.pushState = function () {
  var ret = pushState.apply(history, arguments);
  window.dispatchEvent(new Event('pushstate'));
  window.dispatchEvent(new Event('locationchange'));
  return ret;
};

history.replaceState = function () {
  var ret = replaceState.apply(history, arguments);
  window.dispatchEvent(new Event('replacestate'));
  window.dispatchEvent(new Event('locationchange'));
  return ret;
};

window.addEventListener('popstate', function () {
  window.dispatchEvent(new Event('locationchange'));
});

window.addEventListener('locationchange', function () {
  if (window.location.href.indexOf('gsc.q') > -1) {
    urlCheck();
    let i = 0;
    const scrollInterval = setInterval(function () {
      i++;
      $('html').scrollTop(0);
      if (i > 10) clearInterval(scrollInterval)
    }, 100)

    setTimeout(function () {
      const interval = setInterval(function () {
        let length = document.getElementsByClassName('gsc-result').length;
        if (length) {
          clearInterval(interval)
          putOgData(length);
          putSponsorOgData();
          putSponsorCSS();
        }
      }, 100)
    }, 1000)
  }
});

const putQuery = () => {
  const searchQuery = window.location.href.split('gsc.q=')[1]?.split('&')[0];
  if (searchQuery) {
    const queryInterval = setInterval(function () {
      const decodedSearchQuery = decodeURIComponent(searchQuery);
      $('#app input[type=text].gsc-input').val(decodedSearchQuery);

      if ($('#app input[type=text].gsc-input').val() === decodedSearchQuery) {
        clearInterval(queryInterval);
        $('#app input[type=submit].gsc-search-button').click();
      }
    }, 100)
  }
}

$(function () {
  $('img').on('error', function () {
    $(this).remove();
  });

  putQuery();
  putSponsorOgData();

  if (window.location.href.indexOf('gsc.q') > -1) {
    $('#app').addClass('hasSearchResult')

    const interval = setInterval(function () {
      let length = $('.gsc-richsnippet-showsnippet-label').length;

      if (length > 0) {
        clearInterval(interval)
        putOgData(length);
        putSponsorCSS();
      }
    }, 100)
  }
})

const putSponsorOgData = () => {
  for (let i = 0; i < $('.gsc-adBlock iframe').length; i++) {
    const iframe = $('iframe').eq(i);
    iframe.on('load', function () {
      const html = iframe.contents();
      $('.gsc-adBlockInvisible').eq(0).append(`${html.text()}`).show()
      iframe.hide();

      $('.styleable-rootcontainer .styleable-visurl').each(function () {
        $(this).parent().hide();
        const sponsorText = $(this).parent().find('>div').html();
        const url = $(this).text();
        const href = $(this).attr('href');
        const striptedUrl = url.replace('https://', '').replace('http://', '').replaceAll('www.', '');
        const src = "https://icon.horse/icon/" + striptedUrl

        $(this).closest('.styleable-rootcontainer').prepend(`
    <p class="txt-sponsor">${sponsorText}</p>
      <div class="box-og box-sponsor-og">
        <div class="box-favicon">
          <svg focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"></path></svg>
          <img class="img-favicon" src="${src}" alt="favicon" class="favicon" onerror="hideImage(this)">
        </div>
        <div class="box-txt">
          <p class="txt-site-name"> </p>
          <div class="box-url"><a href="${href}">${url}</div>
        </div>
      </div>
    `)
      });
    });
  }
}
