/* The archive uses text nodes and links; external reference images are never embedded. */
(function () {
  'use strict';

  const list = document.getElementById('reference-list');
  const count = document.getElementById('reference-count');
  const expand = document.getElementById('expand-all');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const items = window.GARDEN_REFERENCES;
  const categoryLabels = { all: '전체', ink: '새 목표 · 수묵·담채', flower: '기존 · 꽃', brush: '기존 · 브러시', petal: '기존 · 꽃잎' };
  const categoryKickers = { ink: '새 목표 / INK & LIGHT COLOR', flower: '기존 꽃 / FLOWER', brush: '기존 브러시 / BRUSH', petal: '기존 꽃잎 / PETAL' };
  let selected = 'ink';

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function textList(values, emptyText) {
    const entries = Array.isArray(values) ? values.filter(value => typeof value === 'string' && value.trim()) : [];
    if (!entries.length) return element('p', 'empty-note', emptyText || '아직 기록이 없습니다.');
    const ul = element('ul', 'note-list');
    entries.forEach(value => ul.append(element('li', '', value)));
    return ul;
  }

  function externalLink(url, label, className) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return element('span', className, label);
      const anchor = element('a', className, label);
      anchor.href = parsed.href;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.setAttribute('aria-label', label + ' (외부 사이트, 새 탭)');
      return anchor;
    } catch (_) {
      return element('span', className, label);
    }
  }

  function detail(label, content, total) {
    const details = element('details', 'reference-detail');
    const summary = element('summary', '', label);
    if (Number.isInteger(total)) summary.append(element('span', 'summary-count', String(total)));
    const body = element('div', 'detail-content');
    body.append(content);
    details.append(summary, body);
    details.addEventListener('toggle', updateExpandLabel);
    return details;
  }

  function listDetail(label, values, emptyText) {
    return detail(label, textList(values, emptyText), Array.isArray(values) ? values.length : 0);
  }

  function sourceDetails(sources) {
    const ul = element('ul', 'source-list');
    (Array.isArray(sources) ? sources : []).forEach(source => {
      const li = element('li', 'source-entry');
      const heading = element('h5');
      heading.append(externalLink(source.url, source.title || '출처 문서'));
      const dl = element('dl', 'source-facts');
      const facts = [
        ['제작자', source.creator || '기록 없음'],
        ['권리', source.rights || '권리 정보 미확인'],
        ['접근일', source.accessed ? source.accessed + ' UTC' : '기록 없음']
      ];
      facts.forEach(([label, value]) => dl.append(element('dt', '', label), element('dd', '', value)));
      dl.append(element('dt', '', '관찰'));
      const observed = element('dd', source.visualObserved ? 'observed-yes' : 'observed-no', source.visualObserved ? '이미지 직접 관찰 완료' : '문서 확인 · 이미지 미관찰');
      dl.append(observed);
      li.append(heading, dl);
      if (source.imageUrl) {
        const links = element('div', 'source-links');
        links.append(externalLink(source.imageUrl, '참고 이미지 링크 ↗'));
        li.append(links);
      }
      ul.append(li);
    });
    return detail('출처와 권리', ul, Array.isArray(sources) ? sources.length : 0);
  }

  function currentFigure(item) {
    const figure = element('figure', 'study-figure');
    const area = element('div', 'study-image-area');
    const pending = element('p', 'image-pending', item.category === 'ink' ? 'v14 결과 이미지를 불러오는 중입니다.' : '현재 결과 이미지를 준비하고 있습니다.');
    const caption = element('figcaption');
    caption.append(element('span', '', item.category === 'ink' ? (item.resultCaption || 'v14 · 직접 제작한 Canvas 분석 예시. 원작 모사가 아닙니다.') : '기존 목표의 현재 결과 · 직접 제작한 Canvas 출력'));
    const expected = 'evidence/' + (item.category === 'ink' ? 'ink' : item.category === 'petal' ? 'petals' : 'extension') + '/current-' + item.id + '.png';
    if (/^[a-z0-9-]+$/.test(item.id) && item.currentImage === expected) {
      const image = element('img', 'study-image');
      image.alt = item.category === 'ink' ? item.resultCaption || 'v14 자체 제작 Canvas 분석 예시. 참고 원본은 출처 링크에서 확인할 수 있습니다.' : item.name + '의 현재 Canvas 결과. 참고 원본은 출처 링크에서 확인할 수 있습니다.';
      image.loading = 'lazy';
      image.decoding = 'async';
      image.style.opacity = '0';
      const full = element('a', '', '크게 보기 ↗');
      full.href = expected;
      full.hidden = true;
      full.setAttribute('aria-label', item.name + ' 현재 결과 이미지 크게 보기');
      image.addEventListener('load', () => { image.style.opacity = '1'; pending.hidden = true; full.hidden = false; });
      image.addEventListener('error', () => { image.hidden = true; pending.hidden = false; full.hidden = true; if (item.category === 'ink') pending.textContent = 'v14 결과 이미지를 불러오지 못했습니다. 페이지를 새로고침해 주세요.'; });
      area.append(image);
      caption.append(full);
      image.src = expected;
    }
    area.append(pending);
    figure.append(area, caption);
    return figure;
  }

  function reviewSection(item) {
    const section = element('section', 'result-review');
    const heading = element('div', 'review-heading');
    const review = item.review && typeof item.review === 'object' ? item.review : null;
    const title = element('h4', '', '현재 결과 검토');
    title.id = 'review-' + item.id;
    section.setAttribute('aria-labelledby', title.id);
    heading.append(title, element('span', 'stage-badge', review && typeof review.stage === 'string' ? review.stage : '결과 검토 진행'));
    section.append(heading);
    if (review) {
      section.append(
        listDetail('현재 결과에서 관찰한 점', review.observed, '현재 결과 관찰 기록을 준비하고 있습니다.'),
        listDetail('결과에 채택한 특징', review.adopted, '채택한 특징의 검토 기록을 준비하고 있습니다.'),
        listDetail('결과에서 남은 차이', review.remaining, '남은 차이의 검토 기록을 준비하고 있습니다.')
      );
      if (Array.isArray(item.reviewHistory) && item.reviewHistory.length) {
        const history = element('div');
        item.reviewHistory.forEach(record => {
          const entry = element('section');
          entry.append(element('h5', '', record.stage || '이전 검토'), textList(record.observed), textList(record.adopted, '당시 채택 기록 없음'), textList(record.remaining));
          history.append(entry);
        });
        section.append(detail('구현 전 검토 이력', history, item.reviewHistory.length));
      }
    } else {
      section.append(element('p', 'review-pending', '현재 결과의 관찰·채택·남은 차이를 검토하고 있습니다. 아래 구현 기록은 표현 방향을 설명하며 미적 승인을 뜻하지 않습니다.'));
    }
    return section;
  }

  function card(item, index) {
    const article = element('article', 'reference-card');
    article.id = 'ref-' + item.id;
    article.dataset.category = item.category;
    article.setAttribute('aria-labelledby', 'title-' + item.id);
    const header = element('header', 'card-header');
    const kicker = element('div', 'card-kicker');
    kicker.append(element('span', '', categoryKickers[item.category] || item.categoryLabel), element('span', '', String(index + 1).padStart(2, '0')));
    const title = element('h3', 'card-title', item.name);
    title.id = 'title-' + item.id;
    header.append(kicker, title);
    if (item.latin) header.append(element('p', 'card-latin', item.latin));
    if (Array.isArray(item.targets) && item.targets.length) header.append(element('p', 'card-lead', item.targets[0]));
    const body = element('div', 'card-body');
    body.append(
      reviewSection(item),
      sourceDetails(item.sources),
      listDetail('참고 자료에서 관찰한 특징', item.observations),
      listDetail('피하려는 표현', item.avoid),
      listDetail('표현 목표', item.targets),
      listDetail('구현 방향과 기록', item.implementation),
      listDetail('확인하지 못한 점과 미달', item.gaps)
    );
    article.append(header, currentFigure(item), body);
    return article;
  }

  function visibleDetails() {
    return [...list.querySelectorAll('.reference-card:not([hidden]) details')];
  }

  function updateExpandLabel() {
    const details = visibleDetails();
    const allOpen = details.length > 0 && details.every(node => node.open);
    expand.setAttribute('aria-expanded', String(allOpen));
    expand.replaceChildren(document.createTextNode(allOpen ? '모든 상세 접기 ' : '모든 상세 펼치기 '), element('span', '', allOpen ? '−' : '＋'));
    expand.lastChild.setAttribute('aria-hidden', 'true');
  }

  function applyFilter(category) {
    selected = category;
    const cards = [...list.children];
    cards.forEach(node => { node.hidden = category !== 'all' && node.dataset.category !== category; });
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === category)));
    const shown = cards.filter(node => !node.hidden).length;
    const label = categoryLabels[category] || '전체';
    count.textContent = label + ' ' + shown + '개 표시 · 총 ' + items.length + '개';
    updateExpandLabel();
  }

  if (!Array.isArray(items) || !items.length) {
    document.getElementById('data-error').hidden = false;
    count.textContent = '자료를 불러오지 못했습니다.';
    filters.forEach(button => { button.disabled = true; });
    return;
  }

  const fragment = document.createDocumentFragment();
  items.forEach((item, index) => fragment.append(card(item, index)));
  list.append(fragment);
  document.querySelectorAll('[data-count]').forEach(node => {
    node.textContent = String(node.dataset.count === 'all' ? items.length : items.filter(item => item.category === node.dataset.count).length);
  });
  filters.forEach(button => button.addEventListener('click', () => applyFilter(button.dataset.filter)));
  expand.disabled = false;
  expand.addEventListener('click', () => {
    const details = visibleDetails();
    const open = !details.every(node => node.open);
    details.forEach(node => { node.open = open; });
    updateExpandLabel();
  });
  applyFilter(selected);

  if (location.hash) {
    const target = document.getElementById(location.hash.slice(1));
    if (target && target.classList.contains('reference-card')) target.scrollIntoView();
  }
})();
