const serverlesswp = require('../src/index');

describe('serverlesswp tests', () => {
  test('Error with missing event property', () => {
    const args = {docRoot: '/'}
    expect(async () => await serverlesswp.validate(args)).rejects.toThrow();
  });
  
  test('Error with empty event property', () => {
    const args = {event: '', docRoot: '/'}
    expect(async () => await serverlesswp.validate(args)).rejects.toThrow();
  });
  
  test('Error with missing docRoot', () => {
    const args = {event: 'test'}
    expect(async () => await serverlesswp.validate(args)).rejects.toThrow();
  });
  
  test('Error with invalid docRoot property', () => {
    const args = {event: {}, docRoot: '/invalid'}
    expect(async () => await serverlesswp.validate(args)).rejects.toThrow();
  });
  
  test('Error with invalid routerScript property', () => {
    const args = {event: {}, docRoot: '/', routerScript: '/invalid'}
    expect(async () => await serverlesswp.validate(args)).rejects.toThrow();
  });

  test('Plugin registration', () => {
    serverlesswp.registerPlugin({name: 'foo'});
    serverlesswp.registerPlugin({name: 'bar'});
  
    const plugins = serverlesswp.getPlugins();
    expect(plugins).toHaveLength(2);
  });
});
