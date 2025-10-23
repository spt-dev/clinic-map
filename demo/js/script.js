document.addEventListener('DOMContentLoaded', async () => {
  try {
    const { embedClinicMap } = await import(
      // 'https://cdn.jsdelivr.net/gh/spt-dev/clinic-map@master/source/js/main.js'
      '../../source/js/main.js'
    );

    // 【JUNO-1】二重・クマ・糸・小顔・女性泌尿器
    const embedClinicMapInstance1 = embedClinicMap({
      parentSelector: '#clinic-list-1',
      clinicType: 'juno-1',
      colors: { mainColor: '#fd7ea5', subColor: '#ffdee8' },
    });
    embedClinicMapInstance1.init();

    // 【JUNO-2】スルリム
    const embedClinicMapInstance2 = embedClinicMap({
      parentSelector: '#clinic-list-2',
      clinicType: 'juno-2',
      colors: { mainColor: '#79b169ff', subColor: '#edffdeff' },
    });
    embedClinicMapInstance2.init();

    // 【JUNO-3】冷却
    const embedClinicMapInstance3 = embedClinicMap({
      parentSelector: '#clinic-list-3',
      clinicType: 'juno-3',
      colors: { mainColor: '#ffc157', subColor: '#fff9deff' },
    });
    embedClinicMapInstance3.init();

    // 【JUNO-4】AGA(女性)
    const embedClinicMapInstance4 = embedClinicMap({
      parentSelector: '#clinic-list-4',
      clinicType: 'juno-4',
      colors: { mainColor: '#6be080ff', subColor: '#deffdfff' },
    });
    embedClinicMapInstance4.init();

    // 【ATOM-1】泌尿器、ED
    const embedClinicMapInstance5 = embedClinicMap({
      parentSelector: '#clinic-list-5',
      clinicType: 'atom-1',
      colors: { mainColor: '#7eb8fd', subColor: '#cee5ff' },
    });
    embedClinicMapInstance5.init();

    // 【ATOM-2】AGA(男性)
    const embedClinicMapInstance6 = embedClinicMap({
      parentSelector: '#clinic-list-6',
      clinicType: 'atom-2',
      colors: { mainColor: '#7e7efdff', subColor: '#ced0ffff' },
    });
    embedClinicMapInstance6.init();

    // 【BeYOU-1】
    const embedClinicMapInstance7 = embedClinicMap({
      parentSelector: '#clinic-list-7',
      clinicType: 'beyou-1',
      colors: { mainColor: '#dfce6aff', subColor: '#fff8ceff' },
    });
    embedClinicMapInstance7.init();
  } catch (e) {
    console.error(e);
  }
});
