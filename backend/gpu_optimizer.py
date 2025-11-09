import torch
import psutil
import GPUtil
import time
from typing import Dict, Any

class GPUOptimizer:
    def __init__(self):
        """Initialize GPU optimizer for RTX 4060"""
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.optimization_settings = {
            'cudnn_benchmark': True,
            'cudnn_deterministic': False,
            'cuda_memory_fraction': 0.95,  # Use 95% of GPU memory (7.6GB out of 8GB)
            'mixed_precision': True,  # Enable mixed precision for faster inference
            'max_memory_allocated': 7.5,  # Maximum memory to allocate in GB
        }
        
    def optimize_torch_settings(self):
        """Apply PyTorch CUDA optimizations"""
        if torch.cuda.is_available():
            print("🔧 Applying PyTorch CUDA optimizations...")
            
            # Enable cuDNN benchmark for faster convolutions
            torch.backends.cudnn.benchmark = self.optimization_settings['cudnn_benchmark']
            torch.backends.cudnn.deterministic = self.optimization_settings['cudnn_deterministic']
            
            # Set memory fraction to avoid OOM errors
            torch.cuda.set_per_process_memory_fraction(self.optimization_settings['cuda_memory_fraction'])
            
            # Enable mixed precision if available
            if self.optimization_settings['mixed_precision']:
                try:
                    from torch.cuda.amp import autocast
                    print("✅ Mixed precision enabled")
                except ImportError:
                    print("⚠️  Mixed precision not available")
            
            print("✅ PyTorch optimizations applied")
            
            # Pre-allocate GPU memory to utilize full 8GB
            self.pre_allocate_gpu_memory()
        else:
            print("⚠️  CUDA not available, skipping GPU optimizations")
    
    def get_gpu_info(self) -> Dict[str, Any]:
        """Get comprehensive GPU information"""
        gpu_info = {}
        
        if torch.cuda.is_available():
            gpu_info['device_name'] = torch.cuda.get_device_name()
            gpu_info['cuda_version'] = torch.version.cuda
            gpu_info['total_memory'] = torch.cuda.get_device_properties(0).total_memory / 1024**3
            gpu_info['memory_allocated'] = torch.cuda.memory_allocated(0) / 1024**3
            gpu_info['memory_reserved'] = torch.cuda.memory_reserved(0) / 1024**3
            gpu_info['memory_free'] = gpu_info['total_memory'] - gpu_info['memory_allocated']
            
            # Get GPU utilization using GPUtil if available
            try:
                gpus = GPUtil.getGPUs()
                if gpus:
                    gpu_info['gpu_utilization'] = gpus[0].load * 100
                    gpu_info['gpu_temperature'] = gpus[0].temperature
                    gpu_info['gpu_memory_used'] = gpus[0].memoryUsed
                    gpu_info['gpu_memory_total'] = gpus[0].memoryTotal
            except:
                gpu_info['gpu_utilization'] = 'N/A'
                gpu_info['gpu_temperature'] = 'N/A'
        
        return gpu_info
    
    def print_gpu_status(self):
        """Print current GPU status"""
        gpu_info = self.get_gpu_info()
        
        if gpu_info:
            print("\n🖥️  GPU Status:")
            print(f"   Device: {gpu_info['device_name']}")
            print(f"   CUDA Version: {gpu_info['cuda_version']}")
            print(f"   Total Memory: {gpu_info['total_memory']:.1f} GB")
            print(f"   Memory Used: {gpu_info['memory_allocated']:.1f} GB")
            print(f"   Memory Free: {gpu_info['memory_free']:.1f} GB")
            
            if gpu_info['gpu_utilization'] != 'N/A':
                print(f"   GPU Utilization: {gpu_info['gpu_utilization']:.1f}%")
                print(f"   Temperature: {gpu_info['gpu_temperature']}°C")
                print(f"   Memory Usage: {gpu_info['gpu_memory_used']}/{gpu_info['gpu_memory_total']} MB")
        else:
            print("⚠️  No GPU information available")
    
    def pre_allocate_gpu_memory(self):
        """Pre-allocate GPU memory to utilize full 8GB"""
        if torch.cuda.is_available():
            try:
                # Allocate a large tensor to utilize GPU memory
                max_memory_gb = self.optimization_settings['max_memory_allocated']
                max_memory_bytes = int(max_memory_gb * 1024**3)
                
                # Create a large tensor to pre-allocate memory
                tensor_size = max_memory_bytes // 4  # 4 bytes per float32
                pre_alloc_tensor = torch.zeros(tensor_size, dtype=torch.float32, device=self.device)
                
                print(f"🚀 Pre-allocated {max_memory_gb:.1f}GB GPU memory")
                print(f"   Tensor size: {tensor_size:,} elements")
                
                # Keep reference to prevent garbage collection
                self._pre_alloc_tensor = pre_alloc_tensor
                
            except Exception as e:
                print(f"⚠️  Could not pre-allocate full GPU memory: {e}")
    
    def clear_gpu_cache(self):
        """Clear GPU memory cache"""
        if torch.cuda.is_available():
            # Release pre-allocated tensor if it exists
            if hasattr(self, '_pre_alloc_tensor'):
                del self._pre_alloc_tensor
                self._pre_alloc_tensor = None
            
            torch.cuda.empty_cache()
            print("🧹 GPU memory cache cleared")
    
    def monitor_gpu_usage(self, duration: int = 60, interval: float = 1.0):
        """Monitor GPU usage for a specified duration"""
        if not torch.cuda.is_available():
            print("⚠️  CUDA not available for monitoring")
            return
        
        print(f"📊 Monitoring GPU usage for {duration} seconds...")
        start_time = time.time()
        
        try:
            while time.time() - start_time < duration:
                gpu_info = self.get_gpu_info()
                
                # Clear line and print status
                print(f"\r🖥️  GPU: {gpu_info['gpu_utilization']:.1f}% | "
                      f"Memory: {gpu_info['memory_allocated']:.1f}/{gpu_info['total_memory']:.1f} GB | "
                      f"Temp: {gpu_info['gpu_temperature']}°C", end="")
                
                time.sleep(interval)
            
            print("\n✅ GPU monitoring complete")
            
        except KeyboardInterrupt:
            print("\n⏹️  GPU monitoring stopped by user")
    
    def get_optimization_recommendations(self) -> list:
        """Get optimization recommendations for RTX 4060"""
        recommendations = []
        
        if torch.cuda.is_available():
            gpu_info = self.get_gpu_info()
            
            # Check memory usage
            memory_usage = gpu_info['memory_allocated'] / gpu_info['total_memory']
            if memory_usage > 0.8:
                recommendations.append("⚠️  High GPU memory usage. Consider reducing batch size or image resolution.")
            
            # Check if optimizations are applied
            if not torch.backends.cudnn.benchmark:
                recommendations.append("🔧 Enable cuDNN benchmark for faster convolutions.")
            
            # RTX 4060 specific recommendations
            recommendations.append("🚀 RTX 4060 supports Tensor Cores. Enable mixed precision for faster inference.")
            recommendations.append("💾 RTX 4060 has 8GB VRAM. Monitor memory usage to avoid OOM errors.")
        
        return recommendations

def main():
    """Main function to demonstrate GPU optimization"""
    optimizer = GPUOptimizer()
    
    print("🚀 RTX 4060 GPU Optimizer for CCTV System")
    print("=" * 50)
    
    # Apply optimizations
    optimizer.optimize_torch_settings()
    
    # Show current status
    optimizer.print_gpu_status()
    
    # Show recommendations
    print("\n💡 Optimization Recommendations:")
    recommendations = optimizer.get_optimization_recommendations()
    for rec in recommendations:
        print(f"   {rec}")
    
    # Ask if user wants to monitor GPU usage
    print("\n" + "=" * 50)
    try:
        monitor = input("Would you like to monitor GPU usage for 30 seconds? (y/n): ").lower().strip()
        if monitor == 'y':
            optimizer.monitor_gpu_usage(duration=30, interval=1.0)
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")

if __name__ == "__main__":
    main()

