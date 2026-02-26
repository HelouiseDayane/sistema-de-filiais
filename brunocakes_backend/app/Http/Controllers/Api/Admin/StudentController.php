<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\Course;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class StudentController extends Controller
{
    /**
     * Display a listing of students.
     */
    public function index(): JsonResponse
    {
        $students = Student::with('courses')->orderBy('created_at', 'desc')->get();
        return response()->json($students);
    }

    /**
     * Store a newly created student.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:20',
            'email' => 'required|email|unique:students,email',
            'birth_date' => 'required|date|before:today',
            'profession' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Dados inválidos',
                'errors' => $validator->errors()
            ], 422);
        }

        $student = Student::create($request->all());

        return response()->json([
            'message' => 'Estudante criado com sucesso',
            'data' => $student
        ], 201);
    }

    /**
     * Display the specified student.
     */
    public function show(Student $student): JsonResponse
    {
        $student->load('courses');
        return response()->json($student);
    }

    /**
     * Update the specified student.
     */
    public function update(Request $request, Student $student): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'phone' => 'sometimes|string|max:20',
            'email' => 'sometimes|email|unique:students,email,' . $student->id,
            'birth_date' => 'sometimes|date|before:today',
            'profession' => 'sometimes|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Dados inválidos',
                'errors' => $validator->errors()
            ], 422);
        }

        $student->update($request->all());

        return response()->json([
            'message' => 'Estudante atualizado com sucesso',
            'data' => $student->fresh()
        ]);
    }

    /**
     * Remove the specified student.
     */
    public function destroy(Student $student): JsonResponse
    {
        $student->delete();

        return response()->json([
            'message' => 'Estudante excluído com sucesso'
        ]);
    }

    /**
     * Enroll student in a course
     */
    public function enrollInCourse(Request $request, Student $student): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'course_id' => 'required|exists:courses,id',
            'payment_status' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Dados inválidos',
                'errors' => $validator->errors()
            ], 422);
        }

        $courseId = $request->course_id;
        
        // Check if already enrolled
        if ($student->courses()->where('course_id', $courseId)->exists()) {
            return response()->json([
                'message' => 'Estudante já está inscrito neste curso'
            ], 409);
        }

        $student->courses()->attach($courseId, [
            'payment_status' => $request->boolean('payment_status', false)
        ]);

        return response()->json([
            'message' => 'Estudante inscrito no curso com sucesso'
        ]);
    }

    /**
     * Update enrollment payment status
     */
    public function updateEnrollmentPayment(Request $request, Student $student, Course $course): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'payment_status' => 'required|boolean'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Dados inválidos',
                'errors' => $validator->errors()
            ], 422);
        }

        if (!$student->courses()->where('course_id', $course->id)->exists()) {
            return response()->json([
                'message' => 'Estudante não está inscrito neste curso'
            ], 404);
        }

        $student->courses()->updateExistingPivot($course->id, [
            'payment_status' => $request->boolean('payment_status')
        ]);

        return response()->json([
            'message' => 'Status de pagamento atualizado com sucesso'
        ]);
    }

    /**
     * Remove student from course
     */
    public function removeFromCourse(Student $student, Course $course): JsonResponse
    {
        if (!$student->courses()->where('course_id', $course->id)->exists()) {
            return response()->json([
                'message' => 'Estudante não está inscrito neste curso'
            ], 404);
        }

        $student->courses()->detach($course->id);

        return response()->json([
            'message' => 'Estudante removido do curso com sucesso'
        ]);
    }
}