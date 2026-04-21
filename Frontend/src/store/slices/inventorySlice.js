import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  createInventoryItem,
  deleteInventoryItem,
  getApiMessage,
  listInventory,
  listMedicines,
  updateInventoryItem
} from '../../api/pimsApi';

export const fetchInventory = createAsyncThunk(
  'inventory/fetchInventory',
  async (params = {}, thunkApi) => {
    try {
      const data = await listInventory(params);
      return data?.inventory || [];
    } catch (error) {
      return thunkApi.rejectWithValue(getApiMessage(error, 'Failed to load inventory'));
    }
  }
);

export const fetchInventoryMedicines = createAsyncThunk(
  'inventory/fetchInventoryMedicines',
  async (params = {}, thunkApi) => {
    try {
      const data = await listMedicines(params);
      return data?.medicines || [];
    } catch (error) {
      return thunkApi.rejectWithValue(getApiMessage(error, 'Failed to load medicines'));
    }
  }
);

export const createInventoryBatch = createAsyncThunk(
  'inventory/createInventoryBatch',
  async (payload, thunkApi) => {
    try {
      const data = await createInventoryItem(payload);
      return data?.item;
    } catch (error) {
      return thunkApi.rejectWithValue(getApiMessage(error, 'Failed to create inventory item'));
    }
  }
);

export const restockInventoryItem = createAsyncThunk(
  'inventory/restockInventoryItem',
  async ({ id, currentStock }, thunkApi) => {
    try {
      const data = await updateInventoryItem(id, {
        currentStock: Number(currentStock) + 25
      });
      return data?.item;
    } catch (error) {
      return thunkApi.rejectWithValue(getApiMessage(error, 'Failed to restock inventory item'));
    }
  }
);

export const updateInventoryBatch = createAsyncThunk(
  'inventory/updateInventoryBatch',
  async ({ id, payload }, thunkApi) => {
    try {
      const data = await updateInventoryItem(id, payload);
      return data?.item;
    } catch (error) {
      return thunkApi.rejectWithValue(getApiMessage(error, 'Failed to update inventory item'));
    }
  }
);

export const deleteInventoryBatch = createAsyncThunk(
  'inventory/deleteInventoryBatch',
  async (id, thunkApi) => {
    try {
      const data = await deleteInventoryItem(id);
      return data?.item;
    } catch (error) {
      return thunkApi.rejectWithValue(getApiMessage(error, 'Failed to delete inventory item'));
    }
  }
);

const inventorySlice = createSlice({
  name: 'inventory',
  initialState: {
    items: [],
    medicines: [],
    isLoading: false,
    isSubmitting: false,
    errorMessage: ''
  },
  reducers: {
    clearInventoryError(state) {
      state.errorMessage = '';
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInventory.pending, (state) => {
        state.isLoading = true;
        state.errorMessage = '';
      })
      .addCase(fetchInventory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload || [];
        state.errorMessage = '';
      })
      .addCase(fetchInventory.rejected, (state, action) => {
        state.isLoading = false;
        state.errorMessage = action.payload || 'Failed to load inventory';
      })
      .addCase(fetchInventoryMedicines.fulfilled, (state, action) => {
        state.medicines = action.payload || [];
      })
      .addCase(fetchInventoryMedicines.rejected, (state, action) => {
        state.medicines = [];
        state.errorMessage = action.payload || state.errorMessage;
      })
      .addCase(createInventoryBatch.pending, (state) => {
        state.isSubmitting = true;
      })
      .addCase(createInventoryBatch.fulfilled, (state, action) => {
        state.isSubmitting = false;
        if (action.payload) {
          state.items = [action.payload, ...state.items];
        }
        state.errorMessage = '';
      })
      .addCase(createInventoryBatch.rejected, (state, action) => {
        state.isSubmitting = false;
        state.errorMessage = action.payload || 'Failed to create inventory item';
      })
      .addCase(restockInventoryItem.pending, (state) => {
        state.isSubmitting = true;
      })
      .addCase(restockInventoryItem.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.errorMessage = '';
        state.items = state.items.map((entry) => (
          entry._id === action.payload?._id ? action.payload : entry
        ));
      })
      .addCase(restockInventoryItem.rejected, (state, action) => {
        state.isSubmitting = false;
        state.errorMessage = action.payload || 'Failed to restock inventory item';
      })
      .addCase(updateInventoryBatch.pending, (state) => {
        state.isSubmitting = true;
      })
      .addCase(updateInventoryBatch.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.errorMessage = '';
        state.items = state.items.map((entry) => (
          entry._id === action.payload?._id ? action.payload : entry
        ));
      })
      .addCase(updateInventoryBatch.rejected, (state, action) => {
        state.isSubmitting = false;
        state.errorMessage = action.payload || 'Failed to update inventory item';
      })
      .addCase(deleteInventoryBatch.pending, (state) => {
        state.isSubmitting = true;
      })
      .addCase(deleteInventoryBatch.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.errorMessage = '';
        if (action.payload?._id) {
          state.items = state.items.filter((entry) => entry._id !== action.payload._id);
        }
      })
      .addCase(deleteInventoryBatch.rejected, (state, action) => {
        state.isSubmitting = false;
        state.errorMessage = action.payload || 'Failed to delete inventory item';
      });
  }
});

export const { clearInventoryError } = inventorySlice.actions;
export default inventorySlice.reducer;