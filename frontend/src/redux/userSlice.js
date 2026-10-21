import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiRequest } from "./api.js";

export const registerUser = createAsyncThunk(
  "user/register",
  async (userDetails) => {
    const result = await apiRequest("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(userDetails),
    });
    return result.user;
  },
);

export const loginUser = createAsyncThunk(
  "user/login",
  async (credentials) => {
    const result = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    return result.user;
  },
);

export const logoutUser = createAsyncThunk("user/logout", async () => {
  await apiRequest("/api/auth/logout", { method: "POST" });
});

export const fetchCurrentUser = createAsyncThunk(
  "user/fetchCurrent",
  async () => {
    try {
      const result = await apiRequest("/api/users/current");
      return result.user;
    } catch (error) {
      if (error.status === 401) {
        return null;
      }
      throw error;
    }
  },
);

export const updateProfile = createAsyncThunk(
  "user/updateProfile",
  async (profileData) => {
    const result = await apiRequest("/api/users/profile", {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
    return result.user;
  },
);

const userSlice = createSlice({
  name: "user",
  initialState: {
    userData: null,
    status: "idle",
    error: null,
    sessionStatus: "idle",
    sessionError: null,
    authChanged: false,
  },
  reducers: {
    setUserData: (state, action) => {
      state.userData = action.payload;
    },
    clearAuthError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
        state.authChanged = true;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.userData = action.payload;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
        state.authChanged = true;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.userData = action.payload;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(logoutUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
        state.authChanged = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.status = "succeeded";
        state.userData = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(updateProfile.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.userData = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(fetchCurrentUser.pending, (state) => {
        state.sessionStatus = "loading";
        state.sessionError = null;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.sessionStatus = "succeeded";
        if (!state.authChanged) {
          state.userData = action.payload;
        }
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.sessionStatus = "failed";
        state.sessionError = action.error.message;
      });
  },
});

export const { clearAuthError, setUserData } = userSlice.actions;
export default userSlice.reducer;