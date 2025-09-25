document.addEventListener('DOMContentLoaded', async () => {
  try {
    const { embedClinicMap } = await import(
      // 'https://cdn.jsdelivr.net/gh/spt-cdn/clinic-map@master/assets/js/main.js'
      '../../source/js/main.js'
    );

    // JUNO type1
    const embedClinicMapInstance1 = embedClinicMap({
      parentSelector: '#clinic-list-1',
      clinicType: 'juno-1',
      showClinicDetails: true,
      colors: { mainColor: '#fd7ea5', subColor: '#ffdee8' },
    });
    embedClinicMapInstance1.init();

    // JUNO type2
    const embedClinicMapInstance2 = embedClinicMap({
      parentSelector: '#clinic-list-2',
      clinicType: 'juno-2',
      showClinicDetails: true,
      colors: { mainColor: '#79b169ff', subColor: '#edffdeff' },
    });
    embedClinicMapInstance2.init();

    // ATOM type1
    const embedClinicMapInstance3 = embedClinicMap({
      parentSelector: '#clinic-list-3',
      clinicType: 'atom-1',
      colors: { mainColor: '#7eb8fd', subColor: '#cee5ff' },
    });
    embedClinicMapInstance3.init();

    // ATOM type2
    const embedClinicMapInstance4 = embedClinicMap({
      parentSelector: '#clinic-list-4',
      clinicType: 'atom-2',
      colors: { mainColor: '#7e7efdff', subColor: '#ced0ffff' },
    });
    embedClinicMapInstance4.init();

    // BeYOU type1
    const embedClinicMapInstance5 = embedClinicMap({
      parentSelector: '#clinic-list-5',
      clinicType: 'beyou-1',
      colors: { mainColor: '#dfce6aff', subColor: '#fff8ceff' },
    });
    embedClinicMapInstance5.init();
  } catch (e) {
    console.error(e);
  } finally {
    console.log(2);
  }
  console.log(1);
});
