const path = require('path');
const serverlesswp = require('../src/index');

const defaultIni = path.resolve(__dirname, '../php-files/php.ini');

describe('buildPhpArgs', () => {
  test('Defaults to the packaged php.ini', () => {
    const args = serverlesswp.buildPhpArgs({docRoot: '/wp'});
    expect(args).toEqual(['-S', '127.0.0.1:8000', '-t', '/wp', '-c', defaultIni]);
  });

  test('phpIniPath overrides the packaged php.ini', () => {
    const args = serverlesswp.buildPhpArgs({docRoot: '/wp', phpIniPath: '/custom/php.ini'});
    expect(args).toContain('/custom/php.ini');
    expect(args).not.toContain(defaultIni);
  });

  test('autoPrependFile is passed as a -d directive', () => {
    const args = serverlesswp.buildPhpArgs({docRoot: '/wp', autoPrependFile: '/var/task/prepend.php'});
    const index = args.indexOf('auto_prepend_file=/var/task/prepend.php');
    expect(index).toBeGreaterThan(-1);
    expect(args[index - 1]).toBe('-d');
  });

  test('The router script stays last', () => {
    const args = serverlesswp.buildPhpArgs({
      docRoot: '/wp',
      autoPrependFile: '/var/task/prepend.php',
      routerScript: '/wp/router.php'
    });
    expect(args[args.length - 1]).toBe('/wp/router.php');
  });
});
