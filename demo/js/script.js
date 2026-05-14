document.addEventListener('DOMContentLoaded', async () => {
  try {
    const { embedClinicMap } = await import(
      // 'https://cdn.jsdelivr.net/gh/spt-dev/clinic-map@master/source/js/main.js'
      '../../source/js/main.js'
    );

    // 【aga】
    const embedClinicMapInstance1 = embedClinicMap({
      parentSelector: '#clinic-list-1',
      clinicType: 'aga',
    });
    embedClinicMapInstance1.init();

     // 【ed】
    const embedClinicMapInstance2 = embedClinicMap({
      parentSelector: '#clinic-list-2',
      clinicType: 'ed'
    });
    embedClinicMapInstance2.init();

     // 【fat_cooling】
    const embedClinicMapInstance3 = embedClinicMap({
      parentSelector: '#clinic-list-3',
      clinicType: 'fat_cooling',
    });
    embedClinicMapInstance3.init();

     // 【surgery】
    const embedClinicMapInstance4 = embedClinicMap({
      parentSelector: '#clinic-list-4',
      clinicType: 'surgery',
    });
    embedClinicMapInstance4.init();

     // 【sururimu】
    const embedClinicMapInstance5 = embedClinicMap({
      parentSelector: '#clinic-list-5',
      clinicType: 'sururimu',
    });
    embedClinicMapInstance5.init();

     // 【urology】
    const embedClinicMapInstance6 = embedClinicMap({
      parentSelector: '#clinic-list-6',
      clinicType: 'urology',
      areaColors: [
        '#ff84afff', // 北海道・東北
        '#9ecdffff', // 東京
        '#7a84ffff', // 関東
        '#75e0e2ff', // 中部
        '#e2e25aff', // 近畿
        '#ec8383ff', // 中国・四国
        '#76d3a6ff' // 九州・沖縄
      ],
    });
    embedClinicMapInstance6.init();
    
  } catch (e) {
    console.error(e);
  }
});
