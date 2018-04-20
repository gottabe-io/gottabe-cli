#ifndef EXAMPLE_DLL_H
#define EXAMPLE_DLL_H

#ifdef __cplusplus
extern "C" {
#endif

#ifdef BUILDING_EXAMPLE_DLL
#define EXAMPLE_DLL __declspec(dllexport)
#else
#define EXAMPLE_DLL __declspec(dllimport)
#endif

EXAMPLE_DLL void __stdcall hello(const char *s);

EXAMPLE_DLL int Double(int x);

#ifdef __cplusplus
}
#endif

// NOTE: this function is not declared extern "C"
EXAMPLE_DLL void CppFunc(void);

// NOTE: this class must not be declared extern "C"
EXAMPLE_DLL class MyClass
{
public:
        MyClass() {};
        virtual ~MyClass() {};
        void func(void);
};

#endif  // EXAMPLE_DLL_H
