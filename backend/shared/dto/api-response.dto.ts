export class ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;

  constructor(success: boolean, data?: T, error?: { code: string; message: string }) {
    this.success = success;
    this.data = data;
    this.error = error;
    this.timestamp = new Date().toISOString();
  }

  static success<T>(data: T): ApiResponse<T> {
    return new ApiResponse(true, data);
  }

  static error<T = never>(code: string, message: string): ApiResponse<T> {
    return new ApiResponse<T>(false, undefined, { code, message });
  }
}
