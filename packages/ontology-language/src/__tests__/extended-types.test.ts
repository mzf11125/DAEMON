import { describe, it, expect } from 'vitest';
import { ObjectTypeSchema } from '../types/object-type.js';
import { ActionTypeSchema } from '../types/action-type.js';

describe('Extended Property Types', () => {
  it('geo_point property parses correctly', () => {
    const input = {
      objectType: {
        apiName: 'Warehouse',
        displayName: 'Warehouse',
        primaryKey: 'warehouseId',
        titleProperty: 'warehouseId',
        properties: [
          { name: 'warehouseId', type: 'string', required: true },
          { name: 'location', type: 'geo_point', required: true },
        ],
      },
    };
    const result = ObjectTypeSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      const geoProp = result.data.objectType.properties.find(p => p.name === 'location');
      expect(geoProp).toBeDefined();
      expect(geoProp?.type).toBe('geo_point');
      expect(geoProp?.required).toBe(true);
    }
  });

  it('reference property with targetObjectType parses', () => {
    const input = {
      objectType: {
        apiName: 'Shipment',
        displayName: 'Shipment',
        primaryKey: 'shipmentId',
        titleProperty: 'shipmentId',
        properties: [
          { name: 'shipmentId', type: 'string', required: true },
          { name: 'customerId', type: 'reference', targetObjectType: 'Customer', required: true },
        ],
      },
    };
    const result = ObjectTypeSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      const refProp = result.data.objectType.properties.find(p => p.name === 'customerId');
      expect(refProp).toBeDefined();
      if (refProp) {
        // Should be typed as reference with targetObjectType
        expect(refProp.type).toBe('reference');
        expect('targetObjectType' in refProp).toBe(true);
        expect((refProp as { targetObjectType: string }).targetObjectType).toBe('Customer');
      }
    }
  });

  it('rejects reference property without targetObjectType', () => {
    const input = {
      objectType: {
        apiName: 'Shipment',
        displayName: 'Shipment',
        primaryKey: 'shipmentId',
        titleProperty: 'shipmentId',
        properties: [
          { name: 'shipmentId', type: 'string', required: true },
          // reference type but missing targetObjectType
          { name: 'customerId', type: 'reference' as const, required: true },
        ],
      },
    };
    const result = ObjectTypeSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('array property with nested items config parses (enum items)', () => {
    const input = {
      objectType: {
        apiName: 'Product',
        displayName: 'Product',
        primaryKey: 'productId',
        titleProperty: 'productId',
        properties: [
          { name: 'productId', type: 'string', required: true },
          {
            name: 'tags',
            type: 'array',
            required: false,
            items: { type: 'enum', values: ['electronics', 'clothing', 'food'] },
          },
        ],
      },
    };
    const result = ObjectTypeSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      const arrProp = result.data.objectType.properties.find(p => p.name === 'tags');
      expect(arrProp).toBeDefined();
      if (arrProp) {
        expect(arrProp.type).toBe('array');
        expect('items' in arrProp).toBe(true);
        const items = (arrProp as { items: { type: string; values?: string[] } }).items;
        expect(items.type).toBe('enum');
        expect(items.values).toEqual(['electronics', 'clothing', 'food']);
      }
    }
  });

  it('array property with reference items parses', () => {
    const input = {
      objectType: {
        apiName: 'Fleet',
        displayName: 'Fleet',
        primaryKey: 'fleetId',
        titleProperty: 'fleetId',
        properties: [
          { name: 'fleetId', type: 'string', required: true },
          {
            name: 'drones',
            type: 'array',
            required: false,
            items: { type: 'reference', targetObjectType: 'Drone' },
          },
        ],
      },
    };
    const result = ObjectTypeSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      const arrProp = result.data.objectType.properties.find(p => p.name === 'drones');
      expect(arrProp).toBeDefined();
      if (arrProp) {
        expect(arrProp.type).toBe('array');
        const items = (arrProp as { items: { type: string; targetObjectType?: string } }).items;
        expect(items.type).toBe('reference');
        expect(items.targetObjectType).toBe('Drone');
      }
    }
  });

  it('array property with simple item type parses', () => {
    const input = {
      objectType: {
        apiName: 'Log',
        displayName: 'Log',
        primaryKey: 'logId',
        titleProperty: 'logId',
        properties: [
          { name: 'logId', type: 'string', required: true },
          {
            name: 'scores',
            type: 'array',
            required: false,
            items: { type: 'number' },
          },
        ],
      },
    };
    const result = ObjectTypeSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      const arrProp = result.data.objectType.properties.find(p => p.name === 'scores');
      expect(arrProp?.type).toBe('array');
    }
  });

  it('json property parses', () => {
    const input = {
      objectType: {
        apiName: 'Event',
        displayName: 'Event',
        primaryKey: 'eventId',
        titleProperty: 'eventId',
        properties: [
          { name: 'eventId', type: 'string', required: true },
          { name: 'payload', type: 'json', required: false },
        ],
      },
    };
    const result = ObjectTypeSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      const jsonProp = result.data.objectType.properties.find(p => p.name === 'payload');
      expect(jsonProp).toBeDefined();
      expect(jsonProp?.type).toBe('json');
    }
  });

  it('rejects array without items', () => {
    const input = {
      objectType: {
        apiName: 'BadType',
        displayName: 'BadType',
        primaryKey: 'id',
        titleProperty: 'id',
        properties: [
          { name: 'id', type: 'string', required: true },
          // array type but missing items
          { name: 'tags', type: 'array' as const, required: true },
        ],
      },
    };
    const result = ObjectTypeSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe('Action with Pre/Post Conditions', () => {
  it('action with preConditions parses', () => {
    const input = {
      actionType: {
        apiName: 'approveShipment',
        displayName: 'Approve Shipment',
        targetObjectType: 'Shipment',
        parameters: [
          { name: 'shipmentId', type: 'string', required: true },
        ],
        requiresApproval: true,
        preConditions: [
          { type: 'FIELD_NOT_NULL', field: 'customerId' },
          { type: 'FIELD_EQUALS', field: 'status', value: 'Draft' },
          { type: 'OBJECT_EXISTS', targetObjectType: 'Customer' },
        ],
      },
    };
    const result = ActionTypeSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.actionType.preConditions).toBeDefined();
      expect(result.data.actionType.preConditions).toHaveLength(3);
      expect(result.data.actionType.preConditions![0].type).toBe('FIELD_NOT_NULL');
      expect(result.data.actionType.preConditions![0].field).toBe('customerId');
    }
  });

  it('action with postConditions parses', () => {
    const input = {
      actionType: {
        apiName: 'completeShipment',
        displayName: 'Complete Shipment',
        targetObjectType: 'Shipment',
        parameters: [],
        requiresApproval: false,
        postConditions: [
          { type: 'SET_FIELD', field: 'status', value: 'Delivered' },
          { type: 'INCREMENT_FIELD', field: 'deliveryCount' },
          { type: 'AUDIT' },
        ],
      },
    };
    const result = ActionTypeSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.actionType.postConditions).toBeDefined();
      expect(result.data.actionType.postConditions).toHaveLength(3);
      expect(result.data.actionType.postConditions![0].type).toBe('SET_FIELD');
    }
  });

  it('action with sideEffects parses', () => {
    const input = {
      actionType: {
        apiName: 'notifyCustomer',
        displayName: 'Notify Customer',
        targetObjectType: 'Shipment',
        parameters: [],
        sideEffects: [
          { type: 'SEND_NOTIFICATION', config: { channel: 'email', template: 'shipment_ready' } },
          { type: 'CREATE_NEO4J_LINK', config: { linkType: 'SHIPPED_FROM', from: 'Shipment', to: 'Warehouse' } },
        ],
      },
    };
    const result = ActionTypeSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.actionType.sideEffects).toBeDefined();
      expect(result.data.actionType.sideEffects).toHaveLength(2);
      expect(result.data.actionType.sideEffects![0].type).toBe('SEND_NOTIFICATION');
    }
  });

  it('action with all condition types parses', () => {
    const input = {
      actionType: {
        apiName: 'fullAction',
        displayName: 'Full Action',
        targetObjectType: 'Target',
        parameters: [],
        preConditions: [
          { type: 'FIELD_IN', field: 'region', value: ['US', 'EU'] },
        ],
        postConditions: [
          { type: 'CREATE_LINK', linkType: 'owns', targetObjectType: 'Asset' },
        ],
        sideEffects: [
          { type: 'TRIGGER_WEBHOOK', config: { url: 'https://example.com/hook', method: 'POST' } },
        ],
      },
    };
    const result = ActionTypeSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.actionType.preConditions).toHaveLength(1);
      expect(result.data.actionType.postConditions).toHaveLength(1);
      expect(result.data.actionType.sideEffects).toHaveLength(1);
    }
  });

  it('action without conditions still parses (backward compat)', () => {
    const input = {
      actionType: {
        apiName: 'testAction',
        displayName: 'Test Action',
        targetObjectType: 'Shipment',
        parameters: [
          { name: 'status', type: 'enum', values: ['Draft', 'Complete'], required: true },
        ],
      },
    };
    const result = ActionTypeSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.actionType.preConditions).toBeUndefined();
      expect(result.data.actionType.postConditions).toBeUndefined();
      expect(result.data.actionType.sideEffects).toBeUndefined();
    }
  });
});
