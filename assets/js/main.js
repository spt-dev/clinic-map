/**
 * クリニック院情報の埋め込み
 *
 * @param {object} params
 * @param {string} params.parentSelector - 埋め込む親要素のIDセレクタ（必須）
 * @param {'juno' | 'juno-diet' | 'atom'} params.clinicType - クリニックタイプ（必須）
 * @param {object} [params.colors={}] - カスタムカラー設定（オプション）
 * @param {string} [params.colors.mainColor]
 * @param {string} [params.colors.subColor]
 */
export function embedClinicMap({ parentSelector, clinicType, colors = {} }) {
  // 引数のバリデーション
  if (!parentSelector || !clinicType) {
    throw new Error('"parentSelector" and "clinicType" is required.');
  } else {
    const isIdSelector = parentSelector.trim().startsWith('#');
    if (!isIdSelector) {
      throw new Error('Please specify an ID selector.');
    }
  }

  /**
   * カラー設定
   *
   * @property {string} titleSvg - メインカラーのカラーコード文字列
   * @property {string} subColor - サブカラーのカラーコード文字列
   */
  const defaultColors = {
    mainColor: '#000',
    subColor: '#fff',
  };

  const mergedColors = {
    ...defaultColors,
    ...colors,
  };

  const { mainColor, subColor } = mergedColors;

  /**
   * 状態管理用のオブジェクト
   *
   * @property {string} titleSvg - タイトル用SVGの文字列
   * @property {string} mapSvg - 地図用SVGの文字列
   * @property {Object} clinicDetails - 医院詳細情報のJSONデータ
   * @property {boolean} isVisibleTitle - タイトルを埋め込む要素の存在有無のフラグ
   * @property {boolean} isVisibleMap - 地図を埋め込む要素の存在有無のフラグ
   * @property {boolean} isVisibleDetailsAccordion - 詳細アコーディオンを埋め込む要素の存在有無のフラグ
   */
  const state = {
    titleSvg: '',
    mapSvg: '',
    clinicDetails: {},
    isVisibleTitle: !!document.querySelector(
      `${parentSelector} [data-cl-title]`
    ),
    isVisibleMap: !!document.querySelector(`${parentSelector} [data-cl-map]`),
    isVisibleDetailsAccordion: !!document.querySelector(
      `${parentSelector} [data-cl-details-accordion]`
    ),
  };

  /**
   * 引数のfetchのレスポンスの Content-Type が、引数で指定したタイプかを判定
   *
   * @param {Response} response - fetchで取得したレスポンスオブジェクト
   * @param {'json' | 'text' | 'xml' | 'html'} type - 判定するコンテンツタイプ
   * @returns {boolean}
   */
  const isContentType = (response, type) => {
    const contentType = response.headers.get('Content-Type');

    if (!contentType) return false;

    switch (type) {
      case 'json':
        return contentType.includes('application/json');
      case 'text':
        return contentType.includes('text/plain');
      case 'xml':
        return (
          contentType.includes('image/svg+xml') ||
          contentType.includes('application/xml')
        );
      case 'html':
        return contentType.includes('text/html');
      default:
        return false;
    }
  };

  /**
   * state に基づき、タイトルと地図のSVG・アコーディオンをDOMに描画
   *
   * - タイトルSVGは data-cl-title に挿入
   * - 地図SVGは data-cl-map に挿入
   * - 院詳細アコーディオンは data-cl-details-accordion に挿入
   *
   * @returns {void}
   */
  const createContents = () => {
    const parser = new DOMParser();

    // タイトルSVG
    if (state.isVisibleTitle && state.titleSvg) {
      const titleEl = document.querySelector(
        `${parentSelector} [data-cl-title]`
      );

      if (state.titleSvg) {
        const titleSvgEl = parser.parseFromString(
          state.titleSvg,
          'image/svg+xml'
        ).documentElement;

        titleEl.innerHTML = '';
        titleEl.appendChild(titleSvgEl);
      }
    }

    // 地図SVG
    if (state.isVisibleMap && state.isVisibleMap) {
      const mapEl = document.querySelector(`${parentSelector} [data-cl-map]`);

      if (state.mapSvg) {
        const mapSvgEl = parser.parseFromString(
          state.mapSvg,
          'image/svg+xml'
        ).documentElement;

        mapEl.innerHTML = '';
        mapEl.appendChild(mapSvgEl);
      }
    }

    // 院詳細アコーディオン
    if (state.isVisibleDetailsAccordion && state.clinicDetails.length > 0) {
      const detailsAccordionElement = document.querySelector(
        `${parentSelector} [data-cl-details-accordion]`
      );

      const detailsAccordionDom = createClinicDetailsAccordion();

      detailsAccordionElement.innerHTML = '';
      detailsAccordionElement.appendChild(detailsAccordionDom);
    }
  };

  /**
   * クリニック詳細のアコーディオンDOMを生成する
   *
   * state.clinicDetails に格納されたデータをもとに生成する
   *
   * @returns {HTMLElement}
   */
  const createClinicDetailsAccordion = () => {
    const container = document.createElement('div');
    container.innerHTML = `<div class="cl-details-acd__list"></div>`;
    const listEl = container.firstElementChild;

    // fetch したJSONデータを元にDOMを作成
    state.clinicDetails.forEach((areaData) => {
      const areaWrapper = document.createElement('div');
      areaWrapper.innerHTML = `
        <div class="cl-details-acd__list-item">
          <label class="cl-details-acd__list-item-header">
            <input type="checkbox">
            ${areaData.area ?? ''}エリア
          </label>
          <div class="cl-details-acd__list-item-body"></div>
        </div>
      `;
      const bodyEl = areaWrapper.querySelector(
        '.cl-details-acd__list-item-body'
      );

      // エリア毎の院情報一覧のDOMを作成
      areaData?.clinics.forEach((clinic) => {
        const iframeHtml = clinic.mapUrl
          ? `<iframe src="${clinic.mapUrl}" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade" class="cl-details-acd__list-sub-item-iframe"></iframe>`
          : '';

        const shopHtml = `
        <div class="cl-details-acd__list-sub-item">
          <div class="cl-details-acd__list-sub-item-header">${
            clinic.name ?? ''
          }</div>
          <table class="cl-details-acd__list-sub-item-table">
            <tr>
              <th>診療時間</th>
              <td>${clinic.hours ?? ''}</td>
            </tr>
            <tr>
              <th>休診日</th>
              <td>${clinic.closed ?? ''}</td>
            </tr>
            <tr>
              <th>住所</th>
              <td>${clinic.address ?? ''}</td>
            </tr>
            <tr>
              <th>最寄駅</th>
              <td>${clinic.stations ?? ''}</td>
            </tr>
          </table>
          ${iframeHtml}
        </div>
      `;

        bodyEl.insertAdjacentHTML('beforeend', shopHtml);
      });

      listEl.appendChild(areaWrapper.firstElementChild);
    });

    return listEl;
  };

  /**
   * スタイルタグの埋め込み
   *
   * - 医院詳細のレイアウト、アコーディオン用CSS
   * - カラー設定（mainColor、subColor）をもとに、SVGや要素の色付け
   *
   * @returns {void}
   */
  const embedStyleTag = () => {
    const styles = `
      /* SVG */
      ${parentSelector} .cl-svg-title {
        stroke-width: 0;
      }
      ${parentSelector} .cl-svg-title-em-text {
        fill: ${mainColor}
      }
      ${parentSelector} .cl-svg-map-area-line line {
        stroke: ${mainColor}
      }
      ${parentSelector} .cl-svg-map-main {
        fill: ${mainColor}
      }
      ${parentSelector} .cl-svg-map-area-name {
        fill: ${mainColor}
      }
      /* 詳細アコーディオン */
      ${parentSelector} .cl-details-acd__list {
        padding: 1.5rem;
      }
      ${parentSelector} .cl-details-acd__list-item:not(:last-child) {
        margin-bottom: 1.5rem;
      }
      ${parentSelector} .cl-details-acd__list-item-header {
        display: block;
        padding: 1.5rem 1.2rem;
        border-radius: 10px;
        position: relative;
        color: #111;
        text-align: center;
        font-size: 1.4rem;
      }
      /* アコーディオン色設定 */
      ${parentSelector} .cl-details-acd__list-item-header {
        background-color: ${subColor}
      }

      @media (hover: hover) {
        ${parentSelector} .cl-details-acd__list-item-header:hover {
          opacity: 0.8;
          transition: opacity 0.2s;
        }
      }
      ${parentSelector} .cl-details-acd__list-item-header::after {
        width: 1.3rem;
        height: 1.3rem;
        content: '';
        mask: url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4gPHN2ZyBpZD0ibWRpLXBsdXMtbWludXMiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmlld0JveD0iMCAwIDUwIDUwIj4gICA8cGF0aCBkPSJNMjEuNDQsMy42M3YxNy44MUgzLjYzdjcuMTJoMTcuODF2MTcuODFoNy4xMnYtMTcuODFoMTcuODF2LTcuMTJoLTE3LjgxVjMuNjNoLTcuMTIiLz4gPC9zdmc+) center / 100% auto no-repeat;
        background-color: #111;
        position: absolute;
        top: 50%;
        right: 3%;
        transform: translateY(-50%);
      }
      ${parentSelector} .cl-details-acd__list-item-header input[type='checkbox'] {
        display: none;
      }
      ${parentSelector} .cl-details-acd__list-item-body {
        height: 0;
        padding: 0 1rem;
        overflow: hidden;
        transition: padding 0.3s;
      }
      /* for when opened */
      ${parentSelector} .cl-details-acd__list-item-header:has(input[type='checkbox']:checked) + .cl-details-acd__list-item-body {
        height: auto;
        padding: 1.5rem 1rem 0.5rem 1rem;
        transition: padding 0.3s;
      }
      ${parentSelector} .cl-details-acd__list-item-header:has(input[type='checkbox']:checked)::after {
        mask: url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4gPHN2ZyBpZD0ibWRpLXBsdXMtbWludXMiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmlld0JveD0iMCAwIDUwIDUwIj4gICA8cmVjdCB4PSIzLjYzIiB5PSIyMS40NCIgd2lkdGg9IjQyLjc1IiBoZWlnaHQ9IjcuMTIiLz4gPC9zdmc+) center / 100% auto no-repeat;
      }
      /* / for when opened */
      ${parentSelector} .cl-details-acd__list-sub-item {
        margin-bottom: 1.5em;
      }
      ${parentSelector} .cl-details-acd__list-sub-item-header {
        padding: 1rem 0;
        margin-bottom: 1rem;
        border-top: 1px solid #222;
        border-bottom: 1px solid #222;
        text-align: center;
        font-size: 1.4rem;
      }
      ${parentSelector} .cl-details-acd__list-sub-item-table {
        margin-bottom: 1rem;
        font-size: 1.2rem;
      }
      ${parentSelector} .cl-details-acd__list-sub-item-table th,
      ${parentSelector} .cl-details-acd__list-sub-item-table td {
        padding: 0.3rem 0;
        text-align: left;
        font-weight: normal;
        vertical-align: top;
        white-space: pre-line;
      }
      ${parentSelector} .cl-details-acd__list-sub-item-table th {
        width: 20%;
      }
      ${parentSelector} .cl-details-acd__list-sub-item-iframe {
        width: 100%;
        border: none;
      }
    `;

    // styleタグ埋め込み
    const styleEle = document.createElement('style');
    styleEle.textContent = styles;

    document.head.appendChild(styleEle);
  };

  /**
   * 引数のURLからをfetchする非同期関数
   *
   * @param {string} url - データを取得するURL
   * @returns {Promise<Response | undefined>}
   */
  const fetchData = async (url) => {
    try {
      const res = await fetch(url);

      // スタータスコード200以外でエラー
      if (!res.ok) throw new Error(`HTTP error status: ${res.status}`);

      return res;
    } catch (e) {
      console.error(e);
    }
  };

  /**
   * タイトルと地図SVG、医院詳細JSONを並列でfetchして、state に格納する非同期処理
   *
   * - 各データは表示するかのフラグ（isVisibleTitle / isVisibleMap / isVisibleDetailsAccordion）にもとづき処理する
   * - fetchに失敗しても他のfetch処理は継続する
   * - Content-Typeをチェックし、正しい形式のレスポンスのみstateに保存
   *
   * @returns {void}
   */

  const fetchAllWithSetData = async () => {
    const promises = {
      title: null,
      map: null,
      details: null,
    };

    // タイトルSVGのfetch先URL
    if (state.isVisibleTitle) {
      const url = new URL(`../images/title.svg`, import.meta.url);
      promises.title = fetchData(url);
    }

    // 地図SVGのfetch先URL
    if (state.isVisibleMap) {
      const url = new URL(`../images/${clinicType}/map.svg`, import.meta.url);
      promises.map = fetchData(url);
    }

    // 院情報詳細JSONのfetch先URL
    if (state.isVisibleDetailsAccordion) {
      const url = new URL(
        `../data/${clinicType}/clinic-details.json`,
        import.meta.url
      );
      promises.details = fetchData(url);
    }

    // 並列で処理
    const [resTitle, resMap, resDetails] = await Promise.all([
      promises.title,
      promises.map,
      promises.details,
    ]);

    // Content-typeが正しければstateに保存
    // タイトルSVG
    if (resTitle && isContentType(resTitle, 'xml')) {
      state.titleSvg = await resTitle.text();
    }

    // 地図SVG
    if (resMap && isContentType(resMap, 'xml')) {
      state.mapSvg = await resMap.text();
    }

    // 医院詳細JSON
    if (resDetails && isContentType(resDetails, 'json')) {
      state.clinicDetails = await resDetails.json();
    }
  };

  /**
   * クリニック院情報の埋め込みの初期化処理
   *
   * - 必要なSVGやJSONリソースを全て取得し、stateに格納
   * - DOM要素とスタイルを埋め込む
   *
   * @returns {void}
   */
  const init = async () => {
    try {
      // 全てのリソース（SVG、JSONデータ）を fetch して state に保存
      await fetchAllWithSetData();
      // state からDOM生成
      createContents();
      embedStyleTag();
    } catch (e) {
      console.error(e);
    }
  };

  return {
    init,
  };
}
