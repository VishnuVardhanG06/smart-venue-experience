const wf = require('../workflows');
const store = require('../store');

describe('Workflow Automations', () => {
  beforeEach(() => {
    // Reset broadcast mock to avoid sending WebSocket traffic during tests
    wf.init(() => {});
  });

  test('WF2 Queue Alert should trigger push notification if wait < 5 mins', () => {
    const queue = { facility_type: 'food', location_name: 'Test Food Stand', estimated_wait_min: 3 };
    const notificationsBefore = store.notifications.length;
    
    wf.wf2QueueAlert(queue); // Trigger workflow
    
    expect(store.notifications.length).toBe(notificationsBefore + 1);
    expect(store.notifications[0].title).toContain('Short Wait');
  });

  test('WF2 Queue Alert should NOT trigger if wait => 5 mins', () => {
    const queue = { facility_type: 'merch', location_name: 'Test Merch Box', estimated_wait_min: 8 };
    const notificationsBefore = store.notifications.length;
    
    wf.wf2QueueAlert(queue);
    
    expect(store.notifications.length).toBe(notificationsBefore);
  });
});
