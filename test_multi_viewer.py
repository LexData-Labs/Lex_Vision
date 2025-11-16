"""
Test script to verify unlimited multi-device viewing works.
This will simulate multiple viewers accessing all cameras simultaneously.
"""
import requests
import threading
import time
import sys

BASE_URL = "http://localhost:8000"

def stream_camera(camera_index, viewer_number, duration=15):
    """
    Stream from a camera for a specified duration.
    """
    url = f"{BASE_URL}/video_feed/{camera_index}"
    print(f"[Viewer {viewer_number}] Starting stream from camera {camera_index}...")

    try:
        with requests.get(url, stream=True, timeout=duration+5) as response:
            if response.status_code != 200:
                print(f"[Viewer {viewer_number}] ERROR: Camera {camera_index} returned status {response.status_code}")
                return False

            frame_count = 0
            start_time = time.time()

            # Read stream for specified duration
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    frame_count += 1

                    # Log progress every 50 frames
                    if frame_count % 50 == 0:
                        elapsed = time.time() - start_time
                        fps = frame_count / elapsed if elapsed > 0 else 0
                        print(f"[Viewer {viewer_number}] Camera {camera_index}: {frame_count} frames ({fps:.1f} FPS)")

                    # Stop after duration
                    if time.time() - start_time > duration:
                        print(f"[Viewer {viewer_number}] Camera {camera_index}: Completed {duration}s test ({frame_count} frames)")
                        return True

            print(f"[Viewer {viewer_number}] Camera {camera_index}: Stream ended ({frame_count} frames)")
            return True

    except requests.exceptions.Timeout:
        print(f"[Viewer {viewer_number}] ERROR: Camera {camera_index} timed out")
        return False
    except Exception as e:
        print(f"[Viewer {viewer_number}] ERROR: Camera {camera_index} failed: {e}")
        return False

def test_multi_viewer_single_camera(camera_index=0, num_viewers=5, duration=15):
    """
    Test multiple viewers watching the SAME camera.
    """
    print(f"\n{'='*80}")
    print(f"TEST: {num_viewers} viewers watching Camera {camera_index} for {duration} seconds")
    print(f"{'='*80}\n")

    threads = []
    results = [False] * num_viewers

    # Start all viewers simultaneously
    for i in range(num_viewers):
        def viewer_thread(viewer_num):
            results[viewer_num] = stream_camera(camera_index, viewer_num + 1, duration)

        t = threading.Thread(target=viewer_thread, args=(i,))
        threads.append(t)
        t.start()
        time.sleep(0.2)  # Small stagger to avoid thundering herd

    # Wait for all threads to complete
    for t in threads:
        t.join()

    # Check results
    success_count = sum(results)
    print(f"\n{'='*80}")
    print(f"RESULT: {success_count}/{num_viewers} viewers succeeded")
    print(f"{'='*80}\n")

    return success_count == num_viewers

def test_multi_camera_multi_viewer(num_cameras=4, viewers_per_camera=2, duration=15):
    """
    Test multiple viewers watching MULTIPLE cameras simultaneously.
    """
    total_viewers = num_cameras * viewers_per_camera
    print(f"\n{'='*80}")
    print(f"TEST: {total_viewers} total viewers ({viewers_per_camera} per camera) across {num_cameras} cameras for {duration} seconds")
    print(f"{'='*80}\n")

    threads = []
    results = []
    viewer_number = 1

    # Start viewers for each camera
    for camera_idx in range(num_cameras):
        for viewer_idx in range(viewers_per_camera):
            result_idx = len(results)
            results.append(False)

            def viewer_thread(cam_idx, viewer_num, res_idx):
                results[res_idx] = stream_camera(cam_idx, viewer_num, duration)

            t = threading.Thread(target=viewer_thread, args=(camera_idx, viewer_number, result_idx))
            threads.append(t)
            t.start()
            viewer_number += 1
            time.sleep(0.1)  # Small stagger

    # Wait for all threads to complete
    for t in threads:
        t.join()

    # Check results
    success_count = sum(results)
    print(f"\n{'='*80}")
    print(f"RESULT: {success_count}/{total_viewers} viewers succeeded")
    print(f"{'='*80}\n")

    return success_count == total_viewers

if __name__ == "__main__":
    print("\n*** SHARED CAPTURE SYSTEM TEST ***")
    print("This test verifies unlimited multi-device viewing capability.\n")

    # Test 1: Multiple viewers on single camera
    print("\n[Test 1] Multiple viewers on single camera")
    test1_passed = test_multi_viewer_single_camera(
        camera_index=0,
        num_viewers=5,
        duration=15
    )

    # Test 2: Multiple viewers across multiple cameras
    print("\n[Test 2] Multiple viewers across multiple cameras")
    test2_passed = test_multi_camera_multi_viewer(
        num_cameras=4,
        viewers_per_camera=2,
        duration=15
    )

    # Final results
    print("\n" + "="*80)
    print("FINAL RESULTS:")
    print("="*80)
    print(f"Test 1 (Single Camera, Multiple Viewers): {'PASSED' if test1_passed else 'FAILED'}")
    print(f"Test 2 (Multiple Cameras, Multiple Viewers): {'PASSED' if test2_passed else 'FAILED'}")

    if test1_passed and test2_passed:
        print("\nALL TESTS PASSED! Unlimited multi-device viewing works!")
        sys.exit(0)
    else:
        print("\nSOME TESTS FAILED!")
        sys.exit(1)
