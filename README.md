# GottaBe
A simple multi-platform builder for c++.

## Table of Contents
1. [Introduction](#introduction)
2. [Manual](#manual)
3. [Commands](#commands)
    1. [clean](#clean)
    2. [build](#build)
    3. [package](#package)
    4. [install](#install)
    5. [test](#test)
4. [Options](#options)
    1. [-v, --version](#-version)
    2. [-T, --target](#-target-lt-targetname-gt-)
    3. [-xs, --export-sources](#-export-sources)
    4. [-nt, --no-tests](#-no-tests)
5. [Configuration](#configuration)

## Introduction

All tools for building c++ projects may be in the most cases a painful task to accomplish. You have to deal with a lot of complexity which could be avoided if you had a tool that would do it for you.
There are good tools to build and they do it very well, but if you change a little the configurations you will have a lot of trouble.

The idea of GottaBe is to stay simple in all cases.

## Manual

The syntax for using GottaBe is very simple and doesn't need to much parameters. You just need to tell it what to do and it will do. You must call GottaBe in a directory which has a build descriptor, a build.json file.

```
    gottabe build
```
The command line above will build your project.

### Commands

* clean
* build
* package
* install
* test

#### Clean

This command will delete the output folder and all files generated in the building process.
No options are used for this.

Eg.:
```
    gottabe clean
```

#### Build

To compile and link executables or libraries is used the command build. This command will build the project and put all the files generated in the folder "build". If no target is informed in the command, GottaBe will determine it automatically.

The option -T &lt;target&gt; will affect this command.

Eg.:
```
    gottabe build -T Release_Win32
```

#### Package

Package the project with the files generated to the current target. If no files were built command package will automatically build the project.

The options -T and --export-sources affect this command.

Eg.:
```
    gottabe package -T Release_Win32
```

#### Install

Install command will copy the files of a package to the user's package directory and allow this to be used in other projects. If no package was built, this command will call for package command. If no target is informed by the option -T, GottaBe will update the packages directory with the packages previously generated.

The options -T and --export-sources affect this command.

Eg.:
```
    gottabe install -T Release_Win32
```

#### Test

The command test will call for any test specified in the configuration. This command is automatically triggered by build.

This command is incompatible with the option --no-tests.

### Options

#### --version

Shows the version of GottaBe installed.

Eg.:
```
    gottabe --version
```

#### --target &lt;targetName&gt;

Choose a target to build, package or install the project. Requires the name of target as parameter.
This command has the alias -T.

Eg.:
```
    gottabe install -T Release_Win32
```

#### --export-sources

Export the sources when building a package. You can type also -xs as an alias for this option.

Eg.:
```
    gottabe package -xs
```

#### --no-tests

Or -nt prevents the project of being tested.

### Configuration

The building process must be configured to work and this is accomplished by creating a build.json file in the root folder of the project.

The structure of the file is as simple as possible to make building a c++ project an easy task.

This configuration is a simple json file with relaxed syntax and it must follow the example bellow.

``` JavaScript
{
    name : 'DllSample',                         // it's an ID name used to identify the package and the project
    description: 'A simple example of dll',     // A description of the project
    author:'Alan N. Lohse',                     // the name of the author
    source : 'https://github.com/alanlohse/gottabe/examples/dllsample', // the address of the source code repository
    version: '1.0',                             // the version number
    type : 'shared library',                    // the type of artifact generated it can be 'shared library', 'static library' ou 'executable'
    dependencies : [                            // a list of packages used to build
        'AnyLib/1.0.0 => http://anysite.com/anylib' // the name of the package followed by its version the mask '=>' and the site are not required, but necessary if you want GottaBe to get them from the web.
    ],
    includeDirs : [],                           // extra include directories
    sources:['./src/samples.cpp'],              // source files ou directories
    targets : [                                 // the targets list
        {
            name:'Debug',                       // the name of the target
            arch: 'x64',                        // the archtecture, it can be x64 or x86
            platform: 'win32',                  // the platform win32, linux etc.
            toolchain: 'mingw',                 // the toolchain used. In the current version only mingw is available
            includeDirs : [],                   // extra include directories for this target
            sources:[],                         // source files only for this target
            options: '-O0 -g3 -Wall',           // options passed to the compiled
            defines:{                           // defines -D <name>=<value>
                'DEBUG' : '',
                'BUILDING_EXAMPLE_DLL' : ''
            },
            libraryPaths : [],                  // library paths passed to the linker
            libraries : [],                     // library names
            linkoptions : ''                    // options passed to the linker
        },
        {
            name:'Release',
            arch: 'x64',
            platform: 'win32',
            toolchain: 'mingw',
            includeDirs : [],
            sources:[],
            options: '-O3 -Wall',
            defines:{
                'BUILDING_EXAMPLE_DLL' : ''
            },
            libraryPaths : [],
            libraries : [],
            linkoptions : '-s'
        }
    ], 
    package : {                                 // details about the package
        name : 'dllsample',                     // name of the artifact
        includes :['./src/dllsample.h'],        // headers and directories to be packaged as include
        other:[]                                // other files
    }
}
```
