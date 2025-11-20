import { requestPermissions } from '../handlePermissions';

jest.mock('react-native', () => ({
  Platform: {
    OS: 'android',
  },
  PermissionsAndroid: {
    PERMISSIONS: {
      WRITE_EXTERNAL_STORAGE: 'android.permission.WRITE_EXTERNAL_STORAGE',
    },
    RESULTS: {
      GRANTED: 'granted',
      DENIED: 'denied',
    },
    request: jest.fn(() => Promise.resolve(true)),
  },
}));

describe('Permission Granted', () => {
  it('should return true if permission is granted', async () => {
    const permissionDialogTitle = 'Permission title';
    const permissionDialogMessage = 'Permission message';

    const granted = await requestPermissions(
      permissionDialogTitle,
      permissionDialogMessage
    );

    expect(granted).toBe(true);
  });
});
