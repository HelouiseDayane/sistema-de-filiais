<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class CourseController extends Controller
{
    /**
     * Display active courses for public
     */
    public function index(): JsonResponse
    {
        $courses = Course::where('is_active', true)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($course) {
                return [
                    'id' => $course->id,
                    'name' => $course->name,
                    'description' => $course->description,
                    'image' => $course->image ? asset('storage/' . $course->image) : null,
                    'location' => $course->location,
                    'full_address' => $course->full_address,
                    'duration_hours' => $course->duration_hours,
                    'schedule' => $course->schedule,
                    'price' => $course->price,
                    'enrolled_count' => $course->students()->count(),
                ];
            });

        return response()->json($courses);
    }

    /**
     * Show specific course details
     */
    public function show(Course $course): JsonResponse
    {
        if (!$course->is_active) {
            return response()->json([
                'message' => 'Curso não disponível'
            ], 404);
        }

        return response()->json([
            'id' => $course->id,
            'name' => $course->name,
            'description' => $course->description,
            'image' => $course->image ? asset('storage/' . $course->image) : null,
            'location' => $course->location,
            'latitude' => $course->latitude,
            'longitude' => $course->longitude,
            'street' => $course->street,
            'number' => $course->number,
            'neighborhood' => $course->neighborhood,
            'city' => $course->city,
            'state' => $course->state,
            'full_address' => $course->full_address,
            'duration_hours' => $course->duration_hours,
            'schedule' => $course->schedule,
            'price' => $course->price,
            'enrolled_count' => $course->students()->count(),
        ]);
    }

    /**
     * Enroll in course (public registration)
     */
    public function enroll(Request $request, Course $course): JsonResponse
    {
        if (!$course->is_active) {
            return response()->json([
                'message' => 'Curso não disponível para inscrição'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:20',
            'email' => 'required|email',
            'birth_date' => 'required|date|before:today',
            'profession' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Dados inválidos',
                'errors' => $validator->errors()
            ], 422);
        }

        // Find or create student
        $student = Student::firstOrCreate(
            ['email' => $request->email],
            $request->only(['name', 'phone', 'birth_date', 'profession'])
        );

        // Check if already enrolled
        if ($student->courses()->where('course_id', $course->id)->exists()) {
            return response()->json([
                'message' => 'Você já está inscrito neste curso'
            ], 409);
        }

        // Enroll student
        $student->courses()->attach($course->id, [
            'payment_status' => false // Default to unpaid
        ]);

        return response()->json([
            'message' => 'Inscrição realizada com sucesso! Você receberá informações sobre pagamento em breve.',
            'enrollment_id' => $student->id
        ], 201);
    }
}
