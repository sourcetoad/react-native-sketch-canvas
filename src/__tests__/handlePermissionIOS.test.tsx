import {requestPermissions} from '../handlePermissions';

jest.mock('react-native/Libraries/Utilities/Platform', () => {
  const Platform = jest.requireActual(
    'react-native/Libraries/Utilities/Platform',
  );
  Platform.OS = 'ios';
  return Platform;
});

describe('IOS Permission Requestion', () => {
  it('should always return true', async () => {
    const permissionDialogTitle = 'Permission title';
    const permissionDialogMessage = 'Permission message';

    const granted = await requestPermissions(
      permissionDialogTitle,
      permissionDialogMessage,
    );

    expect(granted).toBe(true);
  });
});
