import {requestPermissions} from '../handlePermissions';

jest.mock('react-native/Libraries/Utilities/Platform', () => {
  const Platform = jest.requireActual(
    'react-native/Libraries/Utilities/Platform',
  );
  Platform.OS = 'android';
  return Platform;
});

jest.mock(
  'react-native//Libraries/PermissionsAndroid/PermissionsAndroid',
  () => {
    return {
      ...jest.requireActual(
        'react-native//Libraries/PermissionsAndroid/PermissionsAndroid',
      ),
      request: jest.fn(() => new Promise(resolve => resolve('granted'))),
    };
  },
);

describe('Permission Granted', () => {
  it('should return true if permission is granted', async () => {
    const permissionDialogTitle = 'Permission title';
    const permissionDialogMessage = 'Permission message';

    const granted = await requestPermissions(
      permissionDialogTitle,
      permissionDialogMessage,
    );

    expect(granted).toBe(true);
  });
});
